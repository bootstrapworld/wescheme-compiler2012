#lang racket/base

(require json)

;; A module provider consumes the name of a module,
;; and returns a structured value consisting of
;; the module name, the bytecode, and the list of provides.
;;
;; If the provider cannot provide one, it returns #f.

(define (simple-module-provider name)
  (jsexpr->string (hash 'name "program name"
                        'bytecode "<put bytecode here>"
                        'provides '("x" "y" "z"))))


    