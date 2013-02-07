#lang racket/base

(require json
         racket/runtime-path
         racket/list
         (for-syntax racket/base))

(define-runtime-path local-collects-path (build-path 'up "servlet-htdocs" "collects"))

;; A module provider consumes the name of a module,
;; and returns a structured value consisting of
;; the module name, the bytecode, and the list of provides.
;;
;; If the provider cannot provide one, it returns #f.


(struct module-provider-record (name     ;; symbol
                                bytecode ;; string
                                provides ;; (listof string)
                                ))
  

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
                                           (second a-match)
                                           (with-handlers ([exn:fail? (lambda (exn) '())])
                                             (bytes->jsexpr (third a-match))))]
                  [else #f])))]
       [else
        #f])]))
