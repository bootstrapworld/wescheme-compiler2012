;; Simple call/cc example

(check-expect (call/cc (lambda (k)
		    (+ 1 2 (k 17))))
              17)
