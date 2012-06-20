#lang scheme/base

(require compiler/zo-parse
         scheme/pretty)

(provide bytecode)



(define (bytecode top-level-form)
  (parameterize ([current-namespace (make-base-namespace)])
    (let-values ([(out) (open-output-bytes)])
      (write (compile top-level-form) out)
      (close-output-port out)
      (let ([output (zo-parse (open-input-bytes (get-output-bytes out)))])
        (begin
          (pretty-display output)
          output)))))