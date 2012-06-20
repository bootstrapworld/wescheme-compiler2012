#lang scheme/base

(define (tak x y z)
  (cond [(< y x)
         (tak (tak (sub1 x) y z)
              (tak (sub1 y) z x)
              (tak (sub1 z) x y))]
        [else
         z]))

(define (time work)
  (let* ([start (current-inexact-milliseconds)]
         [_ (work)]
         [end (current-inexact-milliseconds)])
    (- end start)))


(time (lambda () (tak 18 12 6)))
