#lang scheme/base

(define (time work)
  (let* ([start (current-inexact-milliseconds)]
         [_ (work)]
         [end (current-inexact-milliseconds)])
    (- end start)))


(define (f x acc)
  (cond
    [(= x 0)
     acc]
    [else
     (f (sub1 x) (* x acc))]))

(let loop ([i 0])
  (cond
    [(< i 100000)
     (display i)
     (display " ")
     (display (time (lambda () (f i 1))))
     (newline)
     (loop (+ i 1000))]))
