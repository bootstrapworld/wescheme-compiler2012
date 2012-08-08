#lang racket/base
(require racket/contract)

;; a jsexp is either a ht, a vec, or a datum.
(define-struct ht (name key-values) #:transparent)
(define-struct vec (items) #:transparent)
(define-struct int (v) #:transparent)
(define-struct lit (v) #:transparent)

;; A comment (cmt) represents a comment plus associated jsexp.
(define-struct cmt (text a-jsexp) #:transparent)



(define (jsexp? x)
  (or (ht? x)
      (vec? x)
      (int? x)
      (lit? x)
      (cmt? x)))

(define (lit-value? x)
  (or (boolean? x)
      (symbol? x)
      (keyword? x)
      (char? x)
      (string? x)
      (bytes? x)
      (number? x)
      (void? x)
      (path? x)
      (regexp? x)
      (byte-regexp? x)
      (box? x)
      (and (list? x)
           (andmap lit-value? x))
      (and (pair? x)
           (lit-value? (car x))
           (lit-value? (cdr x)))
      (and (vector? x) 
           (andmap lit-value? (vector->list x)))))



(provide [struct-out ht]
         [struct-out vec]
         [struct-out int]
         [struct-out lit]
         [struct-out cmt]
         jsexp?)

;; Turning off these contracts to see if they affect compilation time significantly.
#;(provide [contract-out [struct ht ([name symbol?]
                                   [key-values (listof (list/c symbol? jsexp?))])]
                       [struct vec ([items (listof jsexp?)])]
                       [struct int ([v number?])]
                       [struct lit ([v lit-value?])]
                       [jsexp? (any/c . -> . boolean?)]])