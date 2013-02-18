#lang racket/base

(require json
         racket/runtime-path
         racket/list
         net/url
         net/uri-codec
         (for-syntax racket/base))

(provide (struct-out module-provider-record)
         local-module-provider
         make-wescheme-module-provider
         make-memoizing-module-provider)



(define-runtime-path local-collects-path (build-path 'up "servlet-htdocs" "collects"))

;; A module provider consumes the name of a module,
;; and returns a structured value consisting of
;; the module name, the bytecode, and the list of provides.
;;
;; If the provider cannot provide one, it returns #f.


(struct module-provider-record (name     ;; symbol
                                provides ;; (listof string)
                                )
        #:transparent)
  

;; local-module-provider: symbol -> (U module-provider-record #f)
;; A module provider for the locally-compiled modules.
;; As of this writing, it's mostly the bootstrap
;; stuff.
(define (local-module-provider name)
  (define path-components (regexp-split #px"/" (symbol->string name)))
  (cond
    [(for/or ([p path-components]) (or (string=? p "")
                                       (string=? p ".")
                                       (string=? p "..")))
     #f]
    [else
     (define pathname (path-add-suffix (apply build-path local-collects-path path-components)
                                       #".js"))
     (cond
       [(file-exists? pathname)
        (call-with-input-file pathname
          (lambda (ip)
            (define a-match 
              ;; Majorly ugly ugly hack, but we haven't been able to use JSON for the byte
              ;; for legacy reasons.  Necessitates this manual string munging.  Argh.
              (regexp-match (pregexp (string-append
                                      (regexp-quote (format "window.COLLECTIONS[~s] = {" (symbol->string name)))
                                      ".+\"bytecode\": (.+),"
                                      "\\s*\"provides\": (.+)\\};\n$"))
                            ip))
            (cond [a-match
                   (module-provider-record name
                                           (with-handlers ([exn:fail? (lambda (exn) '())])
                                             (bytes->jsexpr (third a-match))))]
                  [else #f])))]
       [else
        #f])]))



;; wescheme-module-provider: symbol -> (U module-provider-record #f)
;;
;; A module provider using WeScheme.  Uses the loadProject servlet,
;; which generates JSON output that we parse into a module provider
;; record.
(define (make-wescheme-module-provider 
         #:servlet-path [servlet-path "http://www.wescheme.org/loadProject"])
  (define (module-provider name)
    (define maybe-match 
      (regexp-match #px"wescheme/(\\w+)$" (symbol->string name)))
    (cond
     [maybe-match
      (define publicId (second maybe-match))
      (define url
        (string->url 
         (string-append servlet-path "?"
                        (alist->form-urlencoded `((publicId . ,publicId))))))
      (define cust (make-custodian))
      (define a-module-provider-record
        (parameterize ([current-custodian cust])
          (with-handlers ([exn:fail? (lambda (exn) #f)])
            (define port (get-pure-port url))
            (define ht (read-json port))
            (cond [(hash? ht)
                   
                   (module-provider-record 
                    name
                    (hash-ref ht 'provides '()))
                   ]
                  [else #f]))))
      (custodian-shutdown-all cust)
      a-module-provider-record]
     [else
      #f]))
  module-provider)



;; make-memoizing-module-provider: module-provider -> module-provider
;; Given an existing module provider, make a memoizing version of it.
;; The cache uses a weak hash table.
(define (make-memoizing-module-provider a-module-provider)
  (define cache (make-weak-hasheq))
  (define (memoized-module-provider name)
    (hash-ref cache name (lambda ()
                           (define entry (a-module-provider name))
                           (hash-set! cache name entry)
                           entry)))
  memoized-module-provider)



;; (define test-provider (make-wescheme-module-provider))
;; (define looked-up (test-provider 'wescheme/0X8C8Np156))
;; looked-up
