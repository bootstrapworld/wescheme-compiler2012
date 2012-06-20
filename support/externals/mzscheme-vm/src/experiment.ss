#lang scheme

(require compiler/decompile
         compiler/zo-parse
         setup/dirs)

(require scheme/pretty)
(define (try e)
  (pretty-print
   (zo-parse (let-values ([(in out) (make-pipe)])
               (write (parameterize ([current-namespace (make-base-namespace)])
                        (compile e))
                      out)
               (close-output-port out)
               in))))

(define more-scheme-decompiled 
  (zo-parse (open-input-file
             (build-path (find-collects-dir)
                         "scheme/private/compiled/more-scheme_ss.zo"))))


#;(try '(lambda (q . more)
        (letrec ([f (lambda (x) f)])
          (lambda (g) f))))


(try  '(begin
         (define (thunk x)
           (lambda ()
             x))
         
         
         (define (f x)
           (* x x))
         
         (f (f ((thunk 42))))))