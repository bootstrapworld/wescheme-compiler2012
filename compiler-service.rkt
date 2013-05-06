#!/usr/bin/env racket
#lang racket/base

(require racket/runtime-path
         racket/match
         racket/list
         racket/cmdline
         file/gzip
         racket/port
         web-server/web-server
         web-server/http/bindings
         web-server/http/request-structs
         web-server/http/response-structs
         web-server/private/mime-types
         web-server/configuration/responders
         
         (prefix-in sequencer: web-server/dispatchers/dispatch-sequencer)
         (prefix-in filter: web-server/dispatchers/dispatch-filter)
         (prefix-in lift: web-server/dispatchers/dispatch-lift)
         (prefix-in files: web-server/dispatchers/dispatch-files)
         (prefix-in fsmap: web-server/dispatchers/filesystem-map)        
         
         ;; must avoid conflict with the bindings in web-server, by prefixing.
         (prefix-in moby: "src/collects/moby/runtime/binding.ss")
         "find-paren-loc.rkt"
         "this-runtime-version.rkt"
         "src/compiler/mzscheme-vm/collections-module-resolver.ss"
         "src/compiler/mzscheme-vm/write-support.ss"
         "src/compiler/mzscheme-vm/compile.ss"
         "src/compiler/mzscheme-vm/private/json.ss"
         "src/compiler/moby-failure.ss"
         "src/compiler/pinfo.ss"
         "src/collects/moby/runtime/permission-struct.ss"
         "src/collects/moby/runtime/error-struct.ss"
         "src/collects/moby/runtime/error-struct-to-dom.ss"
         "src/collects/moby/runtime/stx.ss"
         "src/collects/moby/runtime/dom-helpers.ss"
         "js-runtime/src/sexp.ss")

(define-runtime-path htdocs "servlet-htdocs")
(define-runtime-path compat 
  "js-runtime/lib/compat")
(define-runtime-path easyxdm "support/easyXDM")

(define-runtime-path mime-types-path "mime.types")
(define-runtime-path file-not-found-path "not-found.html")


;; make-port-response: (values response/incremental output-port)
;; Creates a response that's coupled to an output-port: whatever you
;; write into the output will be pushed into the response.
(define (make-port-response #:mime-type (mime-type #"application/octet-stream")
                            #:with-gzip? (with-gzip? #f))
  (define headers (if with-gzip?
                      (list (header #"Content-Encoding" #"gzip"))
                      (list)))
  (let-values ([(in out)
                (make-pipe)]
               [(CHUNK-SIZE) 1024])
    (values (response
             200 #"OK"
             (current-seconds)
             mime-type
             headers
             (lambda (op)
               (cond
                [with-gzip?
                 (gzip-through-ports in op #f (current-seconds))]
                [else
                 (copy-port in op)])))
            out)))


;; has-program-text?: request -> boolean
;; returns true if the request includes program text.
(define (has-program-text? request)
  (exists-binding? 'program (request-bindings request)))

;; get-program-text: request -> string
;; Returns the textual content of the program.
(define (get-program-text request)
  (extract-binding/single 'program (request-bindings request)))



;; request-accepts-gzip-encoding?: request -> boolean
;; Returns true if we can send a respond with gzip encoding.
(define (request-accepts-gzip-encoding? request)
  (define elts (assq 'accept-encoding (request-headers request)))
  (and elts (member "gzip" (regexp-split #px"," (cdr elts))) #t))
  

;; For testing.
;; Raises 503 half of the time, to make sure the evaluator
;; can still handle it.
(define (start/maybe-503 request)
  (cond
   [(= (random 2) 0)
    (response
     503 #"Service Unavailable"
     (current-seconds)
     #"text/plain"
     '()
     (lambda (op)
       (void)))]
   [else
    (start request)]))



;; Web service consuming programs and producing bytecode.
(define (start request)
  (with-handlers ([void 
                   (lambda (exn-or-moby-error)
                     (define the-exn (if (exn? exn-or-moby-error)
                                         exn-or-moby-error
                                         (make-moby-failure
                                          (format "~a"
                                                  (string-append
                                                   (dom-string-content
                                                    (error-struct->dom-sexp exn-or-moby-error #f))
                                                   "\n"
                                                   (Loc->string (moby-error-location exn-or-moby-error))))
                                          (current-continuation-marks)
                                          exn-or-moby-error)))
                     (cond
                      [(jsonp-request? request)
                       (handle-jsonp-exception-response request the-exn)]
                      [else 
                       (handle-exception-response request the-exn)]))])

    (let*-values ([(program-name)
                   (string->symbol
                    (extract-binding/single 'name (request-bindings request)))]
                  [(program-text) 
                   (get-program-text request)]
                  [(program-input-port) (open-input-string program-text)])
      ;; To support JSONP:
      (cond [(jsonp-request? request)
             (handle-jsonp-response request program-name program-input-port)]
            [else
             (handle-response request program-name program-input-port)]))))




;; jsonp-request?: request -> boolean
;; Does the request look like a jsonp request?
(define (jsonp-request? request)
  (exists-binding? 'callback (request-bindings request)))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; jsonp stuff

;; handle-jsonp-response: -> response
(define (handle-jsonp-response request program-name program-input-port)
  (let-values ([(response output-port) (make-port-response #:mime-type #"text/javascript"
                                                           #:with-gzip? (request-accepts-gzip-encoding? request))]
               [(compiled-program-port) (open-output-bytes)])
    (let ([pinfo (compile/port program-input-port compiled-program-port
                               #:pinfo compiler-service-base-pinfo
                               #:name program-name
                               #:runtime-version THIS-RUNTIME-VERSION)])
      (fprintf output-port "~a(~a);" 
               (extract-binding/single 'callback (request-bindings request))
               (format-output (get-output-bytes compiled-program-port)
                              pinfo
                              request))
      (close-output-port output-port)
      response)))


;; format-output: bytes pinfo request -> bytes
;; Print out output.  If in json format, output is in the form:
;; { 'bytecode' : string,
;;   'permissions' : arrayof string }
;;
;; Otherwise, just returns the bytecode.
(define (format-output output-bytecode pinfo request)
  (cond
    [(wants-json-output? request)
     (let ([op (open-output-bytes)])
       (write-json (make-hash `((bytecode . ,(bytes->string/utf-8 output-bytecode))
                                (permissions . ,(get-android-permissions pinfo))
                                (provides . ,(get-provides pinfo))))
                   op)
       (get-output-bytes op))]

    [else
     (format "(~a)"
	     ;; Raw version just spits the output bytecode.
	     output-bytecode)]))


;; wants-json-output?: request -> boolean
;; Produces true if the client wants json output.
;; json output is allowed to generate the bytecode, permissions, and
;; provides.
(define (wants-json-output? req)
  (let ([bindings (request-bindings req)])
    (and (exists-binding? 'format bindings)
         (string=? (extract-binding/single 'format bindings)
                   "json"))))


;; get-provides: pinfo -> (listof string)
;; Returns a list of the provides of the program.
(define (get-provides pinfo)
  (map (lambda (a-binding)
         (symbol->string (moby:binding-id a-binding)))
       (pinfo-get-exposed-bindings pinfo)))


(define (get-android-permissions pinfo)
 (apply append 
        (map permission->android-permissions
             (pinfo-permissions pinfo))))
              
             


;; handle-jsonp-exception-response: exn -> response
(define (handle-jsonp-exception-response request exn)
  (case (compiler-version request)
    [(0)
     (let-values ([(response output-port) (make-port-response #:mime-type #"text/javascript"
                                                              #:with-gzip? (request-accepts-gzip-encoding? request))])
       (let ([payload
              (format "~a(~a);\n" (extract-binding/single 'on-error (request-bindings request))
                      (sexp->js (exn-message exn)))])
         (fprintf output-port "~a" payload)
         (close-output-port output-port)
         response))]
    [(1)
     (let-values ([(response output-port) (make-port-response #:mime-type #"text/javascript"
                                                              #:with-gzip? (request-accepts-gzip-encoding? request))])
       (let ([payload
              (format "~a(~a);\n" (extract-binding/single 'on-error (request-bindings request))
                      (jsexpr->json (exn->json-structured-output request exn)))])
         (fprintf output-port "~a" payload)
         (close-output-port output-port)
         response))]))
     
;;paren->loc: paren -> loc
;;converts a paren to a loc
(define (paren->loc p)
  (match p
    [(struct paren (text type paren-type p-start p-end))
     (make-Loc p-start 0 0 (- p-end p-start) "<definitions>")]))


;;paren->oppParen: paren -> string
;;takes in a paren and outputs the opposite paren as a string
(define (paren->oppParen p)
  (match p
    [(struct paren (text type paren-type p-start p-end))
    (get-match text)]))
     
;;parenCheck takes as input a string, and outputs a boolean.
;;The string that is input should be either ) } or ], which will return true. Else, false.
(define (parenCheck paren)
  (or (string=? paren ")")  
      (string=? paren "}") 
      (string=? paren "]")))


;; exn->structured-output: exception -> jsexpr
;; Given an exception, tries to get back a jsexpr-structured value that can be passed back to
;; the user.
(define (exn->json-structured-output request an-exn)
  (define (on-moby-failure-val failure-val)
    (make-hash `(("type" . "moby-failure")
                 ("dom-message" . 
                                ,(dom->jsexpr 
                                  (error-struct->dom-sexp failure-val #f)))
                 ("structured-error" .
                  ,(jsexpr->json (make-hash `(("location" . ,(loc->jsexpr (moby-error-location failure-val)))
                                              ("message" . ,(error-struct->jsexpr failure-val)))))))))

  (cond
    [(exn:fail:read? an-exn)
     (define program (get-program-text request))
     (define input-port (open-input-string program))
     (define parens (paren-problem input-port))       ;;assuming that it is a paren problem 
     
     (let ([translated-srclocs 
            (map srcloc->Loc (exn:fail:read-srclocs an-exn))])
       (on-moby-failure-val
        (make-moby-error (if (empty? translated-srclocs)
                             ;; Defensive: translated-srclocs should not be empty, but
                             ;; if read doesn't give us any useful location to point to,
                             ;; we'd better not die here.
                             (make-Loc 0 1 0 0 "")
                             (first translated-srclocs))
                         (cond [(empty? parens)
                                
                                (make-moby-error-type:generic-read-error
                                 (exn-message an-exn)
                                 (if (empty? translated-srclocs) 
                                     empty
                                     (rest translated-srclocs)))]
                               [else
                                (make-Message "read: expected a "
                                              (get-match (paren-text (first parens)))
                                      
                                              (if (parenCheck (get-match (paren-text (first parens))))    
                                                  " to close "
                                                  " to open "
                                                  )

                                              (make-ColoredPart (paren-text (first parens)) (paren->loc (first parens)))
                                              (if (not (empty? (rest parens))) " but found a " "")
                                              (if (not (empty? (rest parens))) (make-ColoredPart (paren-text (second parens)) (paren->loc (second parens))) "")
                                              )]))))]

    [(moby-failure? an-exn)
     (on-moby-failure-val (moby-failure-val an-exn))]

    [else
     (exn-message an-exn)]))


;; dom->jsexpr: dom -> jsexpr
;; Translate a dom structure to one that can pass through.  The dom is treated as a nested list.
(define (dom->jsexpr a-dom)
  (match a-dom
    [(list head-name attribs body ...)
     `(,(symbol->string head-name)
       ,(map (lambda (k+v)
               (list (symbol->string (first k+v))
                     (second k+v))) 
             attribs)
       ,@(map dom->jsexpr body))]
    [else
     a-dom]))



;; srcloc->Loc: srcloc -> jsexp
;; Converts a source location (as stored in exceptions) into one that we can
;; store in error structure values.
(define (srcloc->Loc a-srcloc)
  (make-Loc (srcloc-position a-srcloc)
            (srcloc-line a-srcloc)
            (srcloc-column a-srcloc)
            (srcloc-span a-srcloc)
            (format "~a" (srcloc-source a-srcloc))))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; non jsonp stuff: use with xmlhttprequest
(define (handle-response request program-name program-input-port)
  (let-values  ([(response output-port) 
                 (make-port-response #:mime-type #"text/plain"
                                     #:with-gzip? (request-accepts-gzip-encoding? request))]
                [(program-output-port) (open-output-bytes)])
    (let ([pinfo (compile/port program-input-port program-output-port
                               #:pinfo compiler-service-base-pinfo
                               #:name program-name
                               #:runtime-version THIS-RUNTIME-VERSION)])    
      (display (format-output (get-output-bytes program-output-port) pinfo request) output-port)
      (close-output-port output-port)
      response)))



        
;; handle-exception-response: exn -> response
(define (handle-exception-response request exn)
  (case (compiler-version request)
    [(0)
     (response/full 500 
                    #"Internal Server Error"
                    (current-seconds)
                    #"application/octet-stream"
                    (list)
                    (list (string->bytes/utf-8 (exn-message exn))))]
    [(1)
     (response/full 500 
                    #"Internal Server Error"
                    (current-seconds)
                    #"application/octet-stream"
                    (list)
                    (list (string->bytes/utf-8 
                           (jsexpr->json (exn->json-structured-output request exn)))))]))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Helpers


;; compiler-version: request -> number
;; versions should be interpreted as
;;
;; 0: no support for structured error messages.
;; 1: support for structured error messages.
(define (compiler-version request)
  (cond
    [(exists-binding? 'compiler-version (request-bindings request))
     (string->number (extract-binding/single 'compiler-version (request-bindings request)))]
    [else
     0]))


(define (Loc->string a-loc)
  (format "Location: line ~a, column ~a, span ~a, offset ~a, id ~s" 
          (Loc-line a-loc)
          (Loc-column a-loc)
          (Loc-span a-loc)
          (Loc-offset a-loc)
          (Loc-id a-loc)))


;; relate-to-current-directory: path -> absolute-path
;; Given a path, try to localize it to the current directory if it's relative.
(define (relate-to-current-directory p)
  (cond
    [(absolute-path? p)
     p]
    [(relative-path? p)
     (simplify-path (build-path (current-directory) p))]
    [else
     (error 'relate-to-current-directory "Neither relative nor absolute path" p)]))



;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;


;; Write out a fresh copy of the support library.
(call-with-output-file (build-path htdocs "support.js")
  (lambda (op)
    (write-support "browser" op))
  #:exists 'replace)


;; Also, write out the collections.
(unless (directory-exists? (build-path htdocs "collects"))
  (make-directory (build-path htdocs "collects")))
(write-collections/dir (build-path htdocs "collects"))


(define extra-module-providers (make-parameter '()))


;; We hold onto an anchor to this module's namespace, since extra-module-providers
;; needs it.
(define-namespace-anchor anchor)


(define (extra-module-providers-list->module-provider)
  (define dynamic-module-providers
    (parameterize ([current-namespace (namespace-anchor->namespace anchor)])
      (for/list ([mp (extra-module-providers)])
        (dynamic-require mp 'module-provider))))
  (define (the-module-provider name)
    (for/or ([provider dynamic-module-providers])
      (provider name)))
  the-module-provider)



(define port 8000)
(void (command-line #:program "servlet"
                    #:once-each
                    [("-p" "--port") p "Port (default 8000)" (set! port (string->number p))]
                    #:multi
                    [("--extra-module-provider") 
                     mp
                     "The path of a module, relative to current-directory, that provides an additional 'module-provider"
                     (extra-module-providers 
                      (cons (relate-to-current-directory mp)
                            (extra-module-providers)))]))

(define the-external-module-provider 
  (extra-module-providers-list->module-provider))


;; The initial state of the compiler is this one:
(define compiler-service-base-pinfo 
  (pinfo-update-module-resolver default-base-pinfo
                                (extend-module-resolver-with-module-provider
                                 (pinfo-module-resolver default-base-pinfo)
                                 the-external-module-provider)))

(void
 (serve #:dispatch
        (apply sequencer:make
               (append
                (list (filter:make #rx"^/servlets/standalone.ss" (lift:make start #;start/maybe-503)))
                (map (lambda (extra-files-path)
                       (files:make
                        #:url->path (fsmap:make-url->path extra-files-path)
                        #:path->mime-type (make-path->mime-type mime-types-path)
                        #:indices (list "index.html" "index.htm")))
                     (list htdocs compat easyxdm))
                (list (lift:make
                       (lambda (req)
                         (file-response 404 #"File not found" file-not-found-path))))))
        #:port port
        #:connection-close? #f
        #:listen-ip #f
        #:max-waiting 500))
(printf "WeScheme server compiler started on port ~s.\n" port)
(do-not-return)
