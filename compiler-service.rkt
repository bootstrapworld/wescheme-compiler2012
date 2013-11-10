#!/usr/bin/env racket
#lang racket/base

(require racket/runtime-path
         racket/cmdline
         web-server/web-server
         web-server/http/response-structs
         web-server/private/mime-types
         web-server/configuration/responders
         
         (prefix-in sequencer: web-server/dispatchers/dispatch-sequencer)
         (prefix-in filter: web-server/dispatchers/dispatch-filter)
         (prefix-in lift: web-server/dispatchers/dispatch-lift)
         (prefix-in files: web-server/dispatchers/dispatch-files)
         (prefix-in fsmap: web-server/dispatchers/filesystem-map)        
         
         "compiler-backend.rkt"
         "find-paren-loc.rkt"
         "src/compiler/mzscheme-vm/collections-module-resolver.ss"
         "src/compiler/mzscheme-vm/write-support.ss"
         "src/compiler/mzscheme-vm/compile.ss"
         "src/compiler/pinfo.ss")

(define-runtime-path htdocs "servlet-htdocs")
(define-runtime-path compat 
  "js-runtime/lib/compat")
(define-runtime-path easyxdm "support/easyXDM")

(define-runtime-path mime-types-path "mime.types")
(define-runtime-path file-not-found-path "not-found.html")


  

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
(define (start request*)
  (handle-request (request->prefab-request request*)))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Helpers

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
(set-compiler-service-base-pinfo!
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
        #:connection-close? #t
        #:listen-ip #f
        #:max-waiting 500))
(printf "WeScheme server compiler started on port ~s.\n" port)
(do-not-return)
