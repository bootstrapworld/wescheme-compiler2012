#lang scheme/base
(require "collects/moby/runtime/stx.ss")

(provide (all-defined-out))

;; syntax->stx: syntax -> stx
;; Go from Scheme's syntax objects to our own.
(define (syntax->stx a-syntax)
  (let ([a-loc (make-Loc (syntax-position a-syntax)
                         (syntax-line a-syntax)
                         (syntax-column a-syntax)
                         (syntax-span a-syntax)
                         (format "~a" (syntax-source a-syntax)))])
    (cond
     [(pair? (syntax-e a-syntax))
      (let ([elts
             (map syntax->stx (syntax->list a-syntax))])
        (datum->stx #f
                    elts
                    a-loc))]

     ;; Kludge: stx currently only supports atoms and lists, not boxes.
     ;; This needs to be fixed by extending stx's definition.
     [(box? (syntax-e a-syntax))
      (let ([val (syntax->stx (unbox (syntax-e a-syntax)))])
        (datum->stx #f
                    `(,(datum->stx #f 'box a-loc) ,val)
                      a-loc))]
     
     ;; Kludge: stx currently only supports atoms and lists, not vectors.
     ;; This needs to be fixed by extending stx's definition.
     [(vector? (syntax-e a-syntax))
      (let ([vals (map syntax->stx (vector->list (syntax-e a-syntax)))])
        (datum->stx #f
                    `(,(datum->stx #f 'vector a-loc) ,@vals)
                      a-loc))]
     [else
      (datum->stx #f 
                  (syntax-e a-syntax)
                  a-loc)])))