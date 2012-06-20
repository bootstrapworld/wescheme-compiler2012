#lang scheme/base

(define-struct posn (x y))
(printf "~s\n" (posn-x (make-posn 3 4)))
(printf "~s\n" (posn-y (make-posn 3 4)))

(printf "~s\n" (posn? 3))
(printf "~s\n" (posn? (make-posn 7 8)))