(define (A k x1 x2 x3 x4 x5)
  (local [(define (B)
            (begin
              (set-box! k (- (unbox k) 1))
              (A (box (unbox k)) B x1 x2 x3 x4)))]
    (if (<= (unbox k) 0)
        (+ (x4) (x5))
        (B))))
(check-expect (A (box 10) (lambda () 1) (lambda () -1) (lambda () -1) (lambda () 1) (lambda () 0))
              -67)