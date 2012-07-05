#lang racket
(require syntax-color/scheme-lexer)
(require rackunit)



(define-struct paren (text type paren-type start end) #:transparent)
;;port -> (listof paren)
(define (paren-problem p)
  (letrec ([paren-problem-help 
            (lambda  (port stack)
              (define-values (text type paren-type start end)
                (scheme-lexer port))
              (cond
                [(eof-object? text) (if (empty? stack) 
                                        '() 
                                        (list (first stack)))]
                [(or (string=? text "[") 
                     (string=? text "(")
                     (string=? text "{"))
                 (paren-problem-help port (cons (make-paren text type paren-type start end) stack))]
                [(or (string=? text "]") 
                     (string=? text ")")
                     (string=? text "}"))
                 (if (empty? stack)
                     (list (make-paren text type paren-type start end))
                     (if (not (string=? (paren-text (first stack)) (get-match text) )) ;;if doesnt match
                         (list (first stack) (make-paren text type paren-type start end))
                         (paren-problem-help port (rest stack))))]
                [else (paren-problem-help port stack)]))])
    
    (paren-problem-help p '())))


;;get-match: string -> string
;;finds matching parenthesis
(define (get-match p)
  (cond
    [(string=? p ")") "("]
    [(string=? p "]") "["]
    [(string=? p "}") "{"]
    [else ""]))


(check-equal? (paren-problem (open-input-string "(foo")) (list (make-paren "(" 'parenthesis '|(| 1 2)))
(check-equal? (paren-problem (open-input-string "{)")) (list (make-paren "{" 'parenthesis '|{| 1 2)
                                                             (make-paren ")" 'parenthesis '|)| 2 3)))
(check-equal? (paren-problem (open-input-string "()[][][]{)")) (list (make-paren "{" 'parenthesis '|{| 9 10)
                                                                     (make-paren ")" 'parenthesis '|)| 10 11)))
(check-equal? (paren-problem (open-input-string "(foo)")) '())
(check-equal? (paren-problem (open-input-string "](){](}][")) (list (make-paren"]" 'parenthesis '|]| 1 2)))
(check-equal? (paren-problem (open-input-string "")) '())
(check-equal? (paren-problem (open-input-string "({]")) (list (make-paren "{" 'parenthesis '|{| 2 3)
                                                              (make-paren "]" 'parenthesis '|]| 3 4)))

