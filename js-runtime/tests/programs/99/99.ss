#lang scheme/base
(let loop ([i 99])
  (if (zero? i)
      (printf "1 bottle of beer on the wall\n")
      (begin
	(printf "~a bottles of beer on the wall\n" i)
	(loop (sub1 i)))))
