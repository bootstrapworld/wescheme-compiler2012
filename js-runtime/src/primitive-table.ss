#lang scheme/base

(require compiler/zo-parse
         scheme/match)


;; mapping from nonnegative integers to the names of primitives.
(provide primitive-table)


;; Code is copied-and-pasted from compiler/decompile.
(define primitive-table
  ;; Figure out number-to-id mapping for kernel functions in `primitive'
  (let ([bindings
         (let ([ns (make-base-empty-namespace)])
           (parameterize ([current-namespace ns])
             (namespace-require ''#%kernel)
             (namespace-require ''#%unsafe)
             (namespace-require ''#%flfxnum)
             (for/list ([l (namespace-mapped-symbols)])
               (cons l (with-handlers ([exn:fail? (lambda (x) 
                                                    #f)])
                         (compile l))))))]
        [table (make-hash)])
    (for ([b (in-list bindings)])
      (let ([v (and (cdr b)
                    (zo-parse (let ([out (open-output-bytes)])
                                         (write (cdr b) out)
                                         (close-output-port out)
                                         (open-input-bytes (get-output-bytes out)))))])
        (let ([n (match v
                   [(struct compilation-top (_ prefix (struct primval (n)))) n]
                   [else #f])])
          (hash-set! table n (car b)))))
    table))

