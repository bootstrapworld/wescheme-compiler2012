#lang scheme/base

(define (f x) x)

(display (if (f #t) 'ok 'not-ok))
(newline)
