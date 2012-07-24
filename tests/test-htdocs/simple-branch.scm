;; Very simple branching

(define (f x) x)
(check-expect (if (f #t) 'ok 'not-ok) 'ok)
(check-expect (if (f #f) 'not-ok 'ok) 'ok)
