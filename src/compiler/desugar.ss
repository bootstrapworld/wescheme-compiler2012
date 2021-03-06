#lang s-exp "lang.ss"

(define pair? cons?)

(require "helpers.ss")
(require "pinfo.ss")
(require "env.ss")
(require "modules.ss")
(require "../collects/moby/runtime/stx.ss")
(require "../collects/moby/runtime/error-struct.ss")


;; FIXME: this whole process is non-hygienic macro expansion.


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(define-struct syntax-binding (name ;; symbol
                               transformer ;; stx pinfo -> (list stx pinfo)
                               ))


(define-struct syntax-env (entries))   ;;   (hash of symbol * syntax-binding)


(define empty-syntax-env (make-syntax-env (make-immutable-hash)))

;; syntax-env-lookup: syntax-env symbol -> (or false/c syntax-binding)
(define (syntax-env-lookup a-syntax-env an-id)
  (begin
    (hash-ref (syntax-env-entries a-syntax-env)
              an-id
              #f)))

;; syntax-env-add: syntax-env symbol syntax-binding -> syntax-env
(define (syntax-env-add a-syntax-env an-id a-binding)
  (make-syntax-env 
   (hash-set (syntax-env-entries a-syntax-env)
             an-id
             a-binding)))


(define (loc->vec a-loc)
  (vector (Loc-id a-loc)
          (Loc-offset a-loc)
          (Loc-line a-loc)
          (Loc-column a-loc)
          (Loc-span a-loc)))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; make-default-syntax-env: -> syntax-env
;; Returns the default syntactic environment
(define (make-default-syntax-env)
  (foldl (lambda (entry s-env)
           (syntax-env-add s-env (first entry) 
                           (make-syntax-binding (first entry)
                                                (second entry))))
         empty-syntax-env
         (list (list 'cond desugar-cond)
               (list 'else desugar-else)
               (list 'case desugar-case)
               (list 'let desugar-let)
               (list 'let* desugar-let*)
               (list 'letrec desugar-letrec)
               (list 'quasiquote desugar-quasiquote)
               (list 'unquote desugar-quasiquote)
               (list 'unquote-splicing desugar-quasiquote)
               (list 'local desugar-local)
               (list 'begin desugar-begin)
               
               ; set! is disabled
               ;(list 'set! desugar-set!)
               (list 'if desugar-if)
               (list 'and desugar-boolean-chain)
               (list 'or desugar-boolean-chain)
               (list 'when desugar-when)
               (list 'unless desugar-unless)
               (list 'lambda desugar-lambda)
               (list 'λ desugar-lambda)
               (list 'quote desugar-quote))))





;; desugar-program: program pinfo -> (list program pinfo)
;;
;; FIX BUG: user must not be allowed to rebind any of the primitive keyword names
(define (desugar-program a-program a-pinfo)
  (local [;; processing-loop: program pinfo -> (list program pinfo)
          (define (processing-loop a-program a-pinfo)
            (cond 
              [(empty? a-program)
               (list empty a-pinfo)]
              [else
               (local [(define desugared-elts+pinfo
                         (desugar-program-element (first a-program) a-pinfo))
                       (define desugared-rest+pinfo
                         (processing-loop (rest a-program) 
                                          (second desugared-elts+pinfo)))]
                 (list (append (first desugared-elts+pinfo)
                               (first desugared-rest+pinfo))
                       (second desugared-rest+pinfo)))]))]
    
    (processing-loop a-program a-pinfo)))

;; bare-keyword?: an-element -> boolean   This method is a helper checking for specific bare keywords. 
(define (bare-keyword? an-element)
  (and (symbol? (stx-e an-element))
       (or (eq? (stx-e an-element) 'define)
           (eq? (stx-e an-element) 'define-struct))))


;; desugar-program-element: program-element pinfo -> (list (listof program-element) pinfo)
(define (desugar-program-element an-element a-pinfo)
  (cond
    [(bare-keyword? an-element)
     (raise (make-moby-error (stx-loc an-element)
                               (make-Message (make-ColoredPart  (symbol->string (stx-e an-element)) (stx-loc an-element))
                                             ": expected an open parenthesis before "
                                             (symbol->string (stx-e an-element))
                                             ", but found none")))]
    [(defn? an-element)
     (desugar-defn an-element a-pinfo)]
    [(library-require? an-element)
     (list (list an-element) a-pinfo)]
    [(require-permission? an-element)
     (list (list an-element) a-pinfo)]
    [(provide-statement? an-element)
     (list (list an-element) a-pinfo)]
    [(provide/contract-statement? an-element)
     (desugar-provide/contract an-element a-pinfo)]
    [(expression? an-element)
     (local [(define expr+pinfo (desugar-expression an-element a-pinfo))]
       (list (list (tag-toplevel-expression-for-printing (first expr+pinfo)))
             (second expr+pinfo)))]))



;; desugar-defn: defn pinfo -> (list (listof defn) pinfo)
(define (desugar-defn a-defn a-pinfo)
  (local [(define define-stx (first (stx-e a-defn)))]
    (case-analyze-definition a-defn
                             (lambda (id args body) 
                               (begin
                                 (check-duplicate-identifiers! (cons id args) define-stx)   
                                 (local [(define subexpr+pinfo (desugar-expression body a-pinfo))]
                                   (list (list (datum->stx #f (list define-stx
                                                                    (datum->stx #f (cons id args)
                                                                                (stx-loc a-defn))
                                                                    (first subexpr+pinfo))
                                                           (stx-loc a-defn)))
                                         (second subexpr+pinfo)))))
                             (lambda (id body) 
                               (local [(define subexpr+pinfo (desugar-expression body a-pinfo))]
                                 (list (list (datum->stx #f (list define-stx
                                                                  id
                                                                  (first subexpr+pinfo))
                                                         (stx-loc a-defn)))
                                       (second subexpr+pinfo))))
                             (lambda (id fields) 
                               ;; FIXME: extend the environment with the
                               ;; structure identifiers here!
                               (local [(define id-string (symbol->string (stx-e id)))
                                       (define ref-stx (datum->stx #f 
                                                                   (string->symbol
                                                                    (string-append id-string "-ref"))
                                                                   (stx-loc a-defn)))
                                       (define def-values-stx
                                         (datum->stx 
                                          #f 
                                          `(define-values (,id 
                                                           ,(string->symbol
                                                             (string-append "make-" id-string))
                                                           ,(string->symbol
                                                             (string-append id-string "?"))
                                                           ,ref-stx
                                                           ,(string->symbol
                                                             (string-append id-string "-set!")))
                                             (make-struct-type ',id #f ,(length fields) 0))
                                          (stx-loc a-defn)))
                                       (define selector-stxs
                                         (mapi (lambda (field i)
                                                 (datum->stx #f 
                                                             `(define ,(string->symbol 
                                                                        (string-append id-string 
                                                                                       "-" 
                                                                                       (symbol->string (stx-e field))))
                                                                (make-struct-field-accessor ,ref-stx ,i ',(stx-e field)))
                                                             (stx-loc a-defn)))
                                               fields))
                                       ;; FIXME: add bindings to the mutators too.
                                       ]
                                 (list (cons def-values-stx selector-stxs) a-pinfo)))
                             
                             (lambda (ids body)
                               (local [(define desugared-body+pinfo (desugar-expression body a-pinfo))]
                                 (list (list (datum->stx #f 
                                                         `(define-values (,@ids) 
                                                            ,(first 
                                                              desugared-body+pinfo))
                                                         (stx-loc a-defn)))
                                       (second desugared-body+pinfo)))))))



;; desugar-expressions: (listof expr) pinfo -> (list (listof expr) pinfo)
(define (desugar-expressions exprs pinfo)
  (cond
    [(empty? exprs)
     (list empty pinfo)]
    [else
     (local [(define first-desugared+pinfo 
               (desugar-expression (first exprs) pinfo))
             (define rest-desugared+pinfo 
               (desugar-expressions (rest exprs) 
                                    (second first-desugared+pinfo)))]
       (list (cons (first first-desugared+pinfo)
                   (first rest-desugared+pinfo))
             (second rest-desugared+pinfo)))]))


;; thunkify-stx: stx -> stx
;; Wraps a thunk around a syntax.
(define (thunkify-stx an-stx)
  (datum->stx #f 
              (list 'lambda (list)
                    an-stx)
              (stx-loc an-stx)))


;; check-length!: stx -> void
(define (check-test-case-length! stx n error-msg)
  (cond [(not (= n (length (stx-e stx))))
         (raise (make-moby-error 
                 (stx-loc stx)
                 (make-moby-error-type:generic-syntactic-error
                  error-msg
                  (list))))]
        [else
         (void)]))



;; desugar-expression/expr+pinfo: (list expr pinfo) -> (list expr pinfo)
(define (desugar-expression/expr+pinfo expr+pinfo)
  (desugar-expression (first expr+pinfo)
                      (second expr+pinfo)))


;; desugar-expression: expr pinfo -> (list expr pinfo)
(define (desugar-expression expr pinfo)
  (cond    
    ;; () isn't supported.
    [(empty? (stx-e expr))
     (raise (make-moby-error (stx-loc expr)
                             (make-Message
                              (make-ColoredPart "( )" (stx-loc expr))
                              ": expected a function, but nothing's there")))]
                             ;;(make-moby-error-type:unsupported-expression-form expr)))]
    
    ;; Function call/primitive operation call
    [(pair? (stx-e expr))
     (cond
       [(and (symbol? (stx-e (first (stx-e expr))))
             (syntax-binding? (syntax-env-lookup THE-DEFAULT-SYNTACTIC-ENVIRONMENT
                                                 (stx-e (first (stx-e expr))))))
        ((syntax-binding-transformer (syntax-env-lookup THE-DEFAULT-SYNTACTIC-ENVIRONMENT
                                                        (stx-e (first (stx-e expr)))))
         expr pinfo)]
       [else
        (desugar-application expr pinfo)])]
    
    ;; Identifiers
    [(symbol? (stx-e expr))
     (cond
       [(syntax-binding? (syntax-env-lookup THE-DEFAULT-SYNTACTIC-ENVIRONMENT
                                            (stx-e expr)))
        ((syntax-binding-transformer (syntax-env-lookup THE-DEFAULT-SYNTACTIC-ENVIRONMENT
                                                        (stx-e  expr)))
         expr pinfo)]
       [else
        (list expr pinfo)])]
    
    ;; Numbers
    [(number? (stx-e expr))
     (list expr pinfo)]
    
    ;; Strings
    [(string? (stx-e expr))
     (list expr pinfo)]
    
    ;; Literal booleans
    [(boolean? (stx-e expr))
     (list expr pinfo)]
    
    ;; Characters
    [(char? (stx-e expr))
     (list expr pinfo)]
    
    [else
     (list expr pinfo)]))




;; desugar-local: expr pinfo -> (list expr pinfo)
;; Desugars the use of local.
(define (desugar-local expr pinfo)
  (begin
    (check-syntax-application! expr (lambda (expr)
                                      '(local [(define (f x) (* x x))]
                                         (+ (f 3) (f 4)))))
    (when (= (length (stx-e expr)) 1)
      (raise (make-moby-error (stx-loc expr)
                              (make-Message 
                               (make-ColoredPart "local" (stx-loc (first (stx-e expr))))
                               ": expected at least one definition (in square brackets) after local, but nothing's there"))))
    (local:check-all-definitions! (stx-e (second (stx-e expr)))
                                  (stx-loc (second (stx-e expr)))
                                  expr)
    
    (check-single-body-stx! (rest (rest (stx-e expr))) expr)
    
    (local [(define local-symbol-stx (first (stx-e expr)))
            (define defns (stx-e (second (stx-e expr))))
            (define body (third (stx-e expr)))
            
            (define desugared-defns+pinfo 
              (desugar-program defns pinfo))
            (define desugared-body+pinfo 
              (desugar-expression body (second desugared-defns+pinfo)))]
      (list (datum->stx #f (list local-symbol-stx
                                 (datum->stx #f (first desugared-defns+pinfo)
                                             (stx-loc (second (stx-e expr))))
                                 (first desugared-body+pinfo))
                        (stx-loc expr))
            (pinfo-update-env (second desugared-body+pinfo)
                              (pinfo-env pinfo))))))


(define (local:check-all-definitions! defns a-loc original-stx)
  (local [(define (raise-error-not-a-list an-stx a-loc)
            (raise (make-moby-error a-loc
                                    (make-Message 
                                     (make-ColoredPart "local" (stx-loc (first (stx-e original-stx))))
                                     ": expected a collection of definitions, but given "
                                     (make-ColoredPart "something else" a-loc)))))
          
          (define (raise-error an-stx a-loc)
            (raise (make-moby-error a-loc
                                    (make-Message 
                                     (make-ColoredPart "local" (stx-loc (first (stx-e original-stx))))
                                     ": expected a definition, but given "
                                     (make-ColoredPart "something else" (stx-loc an-stx))))))]
    (cond
      [(not (list? defns))
       (raise-error-not-a-list defns a-loc)]
      [(empty? defns)
       (void)]
      [(defn? (first defns))
       (local:check-all-definitions! (rest defns) a-loc original-stx)]
      [else
       (raise-error (first defns)
                    (stx-loc (first defns)))])))



;; desugar-application: expr pinfo -> (list expr pinfo)
;; Desugars function application.
(define (desugar-application expr pinfo)
  (local [(define exprs (stx-e expr))
          (define desugared-exprs+pinfo (desugar-expressions exprs pinfo))]
    (list (datum->stx #f (first desugared-exprs+pinfo)
                      (stx-loc expr))
          (second desugared-exprs+pinfo))))



;; desugar-begin: expr pinfo -> (list expr pinfo)
;; desugars the use of begin.
(define (desugar-begin expr pinfo)
  (begin
    (check-syntax-application! expr (lambda (expr)
                                      `(begin (printf "hello~n")
                                              (printf "world~n")
                                              (+ 3 4 5))))
    (cond [(= 1 (length (stx-e expr)))
           (raise (make-moby-error (stx-loc expr)
                                   (make-moby-error-type:begin-body-empty)))]
          [else
           (local [(define begin-symbol-stx (first (stx-e expr)))
                   (define exprs (rest (stx-e expr)))
                   (define desugared-exprs+pinfo (desugar-expressions exprs pinfo))]
             (list (datum->stx #f (cons begin-symbol-stx
                                        (first desugared-exprs+pinfo))
                               (stx-loc expr))
                   (second desugared-exprs+pinfo)))])))




;; force-boolean-context: symbol-stx stx -> stx
;; Force a boolean runtime test on the given expression.
(define (force-boolean-context name bool-expr)
  (tag-application-operator/module 
   (datum->stx #f 
               `(verify-boolean-branch-value
                 (quote ,(symbol->string (stx->datum name)))
                 (quote ,(loc->vec (stx-loc name)))
                 ,bool-expr
                 (quote ,(loc->vec (stx-loc bool-expr))))
               (stx-loc bool-expr))
   'moby/runtime/kernel/misc))


;; (if test-expr then-expr else-expr)
;; desugar-if: stx pinfo -> (list stx pinfo)
;; Desugars the conditional, ensuring that the boolean test is of boolean value.
(define (desugar-if expr pinfo)
  (begin
    (check-syntax-application! expr (lambda (expr)
                                      '(if (= x 42)
                                           'answer
                                           'not-the-answer)))
    (cond
      [(= 4 (length (stx-e expr)))
       (local [(define if-symbol-stx (first (stx-e expr)))
               (define exprs (rest (stx-e expr)))
               (define desugared-exprs+pinfo (desugar-expressions exprs pinfo))
               (define test-expr (first (first desugared-exprs+pinfo)))
               (define then-expr (second (first desugared-exprs+pinfo)))
               (define else-expr (third (first desugared-exprs+pinfo)))]
         (list (datum->stx #f 
                           `(,if-symbol-stx #;,test-expr
                                            ,(force-boolean-context if-symbol-stx test-expr)
                                            ,then-expr
                                            ,else-expr)
                           (stx-loc expr))
               (second desugared-exprs+pinfo)))]
      [(< (length (stx-e expr)) 4)
       (raise (make-moby-error (stx-loc expr)   ;;make-moby-error-type:if-too-few-elements
                               (make-Message (make-ColoredPart "if" (stx-loc (first (stx-e expr))))
                                             ": expected a test, a consequence, and an alternative, but all three were not found")))]
      [(> (length (stx-e expr)) 4)
       (raise (make-moby-error (stx-loc expr) ;;make-moby-error-type:if-too-many-element
                               (make-Message  (make-ColoredPart "if" (stx-loc (first (stx-e expr)))) 
                                              ": expected only a test, a consequence, and an alternative, "
                                              "but found "
                                              (make-MultiPart "more than three of these" (map stx-loc (rest (stx-e expr))) #f))))])))



;; tag-toplevel-expression-for-printing: expression -> expression
;; Add a print-values for an expression at the toplevel.
(define (tag-toplevel-expression-for-printing an-expr)
  (tag-application-operator/module 
   (datum->stx #f 
               `(print-values
                 ,an-expr)
               (stx-loc an-expr))
   'moby/runtime/kernel/misc))




;; desugar-boolean-chain: expr pinfo -> (list expr pinfo)
;; Desugars AND and OR.
(define (desugar-boolean-chain expr pinfo)
  (begin 
    (check-syntax-application! expr
                               (lambda (expr)
                                 `(,(stx-e expr) true false)))
    (cond
      [(< (length (stx-e expr)) 3)
       (raise (make-moby-error (stx-loc expr)
                               (make-Message
                                (make-ColoredPart (symbol->string (stx-e (first (stx-e expr)))) 
                                                  (stx-loc (first (stx-e expr))))
                                ": expected at least 2 arguments, but given " 
                                (if (= (length (stx-e expr)) 2)
                                    (make-ColoredPart "1"
                                                      (stx-loc (second (stx-e expr))))
                                    "0"))))]     
      [else
       (local [(define boolean-chain-stx (first (stx-e expr)))
               (define exprs (rest (stx-e expr)))
               (define desugared-exprs+pinfo (desugar-expressions exprs pinfo))]
         (cond [(symbol=? (stx-e boolean-chain-stx) 'and)
                (list (desugar-and (first desugared-exprs+pinfo) (stx-loc expr)  boolean-chain-stx)
                      (second desugared-exprs+pinfo))]
               [(symbol=? (stx-e boolean-chain-stx) 'or)
                (desugar-or (first desugared-exprs+pinfo) 
                            (stx-loc expr) 
                            (second desugared-exprs+pinfo)  boolean-chain-stx
                            )]))])))



;; desugar-and: (listof expr) loc -> expr
;; Assumption: (length exprs) >= 2
(define (desugar-and exprs loc stx-symbol)
  (cond [(= (length exprs) 2)
         (datum->stx #f 
                     `(if ,(force-boolean-context stx-symbol (first exprs))
                          ,(force-boolean-context stx-symbol (second exprs))
                          #f) 
                     loc)]
        [else
         (datum->stx #f 
                     `(if ,(force-boolean-context stx-symbol (first exprs))
                          ,(desugar-and (rest exprs) loc stx-symbol) 
                          #f) 
                     loc)]))


(define (desugar-or exprs loc pinfo stx-symbol)
  (cond [(= (length exprs) 2)
         (local [(define pinfo+tmp-sym (pinfo-gensym pinfo 'tmp))]
           (desugar-expression/expr+pinfo
            (list (datum->stx #f 
                              `(let ([,(second pinfo+tmp-sym) 
                                      ,(force-boolean-context stx-symbol (first exprs))])
                                 (if ,(second pinfo+tmp-sym)
                                     ,(second pinfo+tmp-sym)
                                     ,(force-boolean-context stx-symbol (second exprs))))
                              loc)
                  (first pinfo+tmp-sym))))]
        [else
         (local [(define pinfo+tmp-sym (pinfo-gensym pinfo 'tmp))
                 (define rest-exprs+pinfo (desugar-or (rest exprs) loc (first pinfo+tmp-sym) stx-symbol))]
           (desugar-expression/expr+pinfo
            (list (datum->stx #f `(let ([,(second pinfo+tmp-sym)
                                         ,(force-boolean-context stx-symbol (first exprs))])
                                    (if ,(second pinfo+tmp-sym)
                                        ,(second pinfo+tmp-sym)
                                        ,(first rest-exprs+pinfo)))
                              loc)
                  (second rest-exprs+pinfo))))]))







;; desugar-lambda: expr pinfo -> (list expr pinfo)
;; Desugars lambda expressions.
(define (desugar-lambda expr pinfo)
  (begin
    (check-syntax-application! expr (lambda (expr)
                                      `(lambda (x y z)
                                         (+ x (* y z)))))
    (when (= (length (stx-e expr)) 1)
      (let ((parts (stx-e expr)))
        (raise (make-moby-error (stx-loc expr)
                                (make-Message 
                                 (make-ColoredPart "lambda" (stx-loc (first parts))) 
                                 ": expected at least one variable (in parentheses) after lambda, but nothing's there")))))
    (when (not (list? (stx-e (second (stx-e expr)))))
      (let ((parts (stx-e expr)))
        (raise (make-moby-error (stx-loc expr)
                                (make-Message 
                                 (make-ColoredPart "lambda" (stx-loc (first parts))) 
                                 ": expected at least one variable (in parentheses) after lambda, but found "
                                 (make-ColoredPart "something else" 
                                                   (stx-loc (second parts))))))))
    (when (not (stx-list-of-symbols? (second (stx-e expr))))
      (let ((parts (stx-e expr)))
        (raise (make-moby-error (stx-loc expr)
                                (make-Message 
                                 (make-ColoredPart "lambda" (stx-loc (first parts))) 
                                 ": expected a list of variables after lambda, but found "
                                 (make-ColoredPart "something else" 
                                                   (stx-loc (find-first-non-symbol (stx-e (second parts))))))))))    
    (when (< (length (stx-e expr)) 3)
      (let ((parts (stx-e expr)))
        (raise (make-moby-error (stx-loc expr)
                                (make-Message 
                                 (make-ColoredPart "lambda" (stx-loc (first parts))) 
                                 ": expected an expression for the function body, but nothing's there")))))
    (when (> (length (stx-e expr)) 3)
      (let ((parts (stx-e expr)))
        (raise (make-moby-error (stx-loc expr)
                                (make-Message 
                                 (make-ColoredPart "lambda" (stx-loc (first parts))) 
                                 ": expected only one expression for the function body, but found "
                                 (make-MultiPart (string-append 
                                                  (number->string (- (length parts) 3))
                                                  " extra part"
                                                  (if (> (- (length parts) 3) 1) "s" ""))
                                                 (map stx-loc (rest (rest (rest parts))))
                                                 #f))))))
    ;; Check number of elements in the lambda
    (check-single-body-stx! (rest (rest (stx-e expr))) expr)
    
    ;; Check for list of identifiers 
    (check-list-of-identifiers! (second (stx-e expr))
                                (first (stx-e expr))
                                (stx-loc expr))
    (check-duplicate-identifiers! (stx-e (second (stx-e expr))) (first (stx-e expr)))
    
    (local [(define lambda-symbol-stx (first (stx-e expr)))
            (define args (second (stx-e expr)))
            (define body (third (stx-e expr)))
            (define desugared-body+pinfo (desugar-expression body pinfo))]
      (list (datum->stx #f (list (datum->stx (stx-context lambda-symbol-stx)
                                             'lambda
                                             (stx-loc lambda-symbol-stx))
                                 args
                                 (first desugared-body+pinfo))
                        (stx-loc expr))
            ;; FIXME: I should extend the pinfo with the identifiers in the arguments.
            (second desugared-body+pinfo)))))



;; check-list-of-identifiers!: stx stx loc -> void
(define (check-list-of-identifiers! thing who loc)
  (when (not (list? (stx-e thing)))
    (raise (make-moby-error loc
                            (make-moby-error-type:expected-list-of-identifiers 
                             who
                             thing)))))



;; desugar-when: expr pinfo -> (list expr pinfo)
;; Desugars when expressions.
(define (desugar-when expr pinfo)
  (begin
    (check-syntax-application! expr (lambda (expr)
                                      `(when (even? x)
                                         (printf "ok~n")
                                         x)))
    (cond 
      [(< (length (stx-e expr)) 3)
       (raise (make-moby-error (stx-loc expr)
                               (make-moby-error-type:when-no-body)))]
      [else
       (local [(define desugared-text&body+pinfo (desugar-expressions (rest (stx-e expr)) pinfo))
               (define test-stx (first (first desugared-text&body+pinfo)))
               (define body-stx (datum->stx #f 
                                            `(begin ,@(rest (first desugared-text&body+pinfo)))
                                            (stx-loc expr)))]
         (list (datum->stx #f
                           `(if ,test-stx
                                ,body-stx
                                (void))
                           (stx-loc expr))
               (second desugared-text&body+pinfo)))])))


;; desugar-unless: expr pinfo -> (list expr pinfo)
;; Desugars unless expressions.
(define (desugar-unless expr pinfo)
  (begin
    (check-syntax-application! expr (lambda (expr)
                                      `(unless (even? x)
                                         (printf "ok~n")
                                         x)))
    
    (cond 
      [(< (length (stx-e expr)) 3)
       (raise (make-moby-error (stx-loc expr)
                               (make-moby-error-type:unless-no-body)))]
      [else
       (local [(define desugared-test&body+pinfo (desugar-expressions (rest (stx-e expr)) pinfo))
               (define test-stx (first (first desugared-test&body+pinfo)))
               (define body-stx (datum->stx #f 
                                            `(begin ,@(rest (first desugared-test&body+pinfo)))
                                            (stx-loc expr)))]
         (list (datum->stx #f
                           `(if ,test-stx
                                (void)
                                ,body-stx)
                           (stx-loc expr))
               (second desugared-test&body+pinfo)))])))



;; desugar-set!: expr pinfo -> (list expr pinfo)
;; Desugars set!.
#;(define (desugar-set! expr pinfo)
    (begin
      (check-syntax-application! expr (lambda (expr)
                                        '(set! x 17)))
      (local [(define set-symbol-stx (first (stx-e expr)))
              (define id (second (stx-e expr)))
              (define value (third (stx-e expr)))
              (define desugared-value+pinfo (desugar-expression value pinfo))]
        (list (datum->stx #f (list set-symbol-stx
                                   id
                                   (first desugared-value+pinfo))
                          (stx-loc expr))
              (second desugared-value+pinfo)))))


(define (desugar-else an-expr pinfo)
  (raise (make-moby-error (stx-loc an-expr)
                          (make-Message (make-ColoredPart "else" (stx-loc an-expr))
                                        ": not allowed "
                                        (make-ColoredPart "here" (stx-loc an-expr))
                                        ", because this is not a question in a clause"))))


;; desugar-case: stx:list -> (list stx:list pinfo)
;; translates case to if.
;;
;; KNOWN BUG: this doesn't do a let binding of the value that's being
;; analyzed, so the value is going to be evaluated again and again.
;; Before we fix this bug, I'd like us to have something like syntax-case and
;; helpers for building syntax objects, because it's really painful
;; to build syntax expanders without linguistic support.
(define (desugar-case an-expr pinfo)
  (local
    [(define pinfo+val-sym (pinfo-gensym pinfo 'val))
     (define updated-pinfo-1 (first pinfo+val-sym))
     (define val-stx (datum->stx #f (second pinfo+val-sym) (stx-loc an-expr)))
     
     (define pinfo+x-sym (pinfo-gensym updated-pinfo-1 'x))
     (define updated-pinfo-2 (first pinfo+x-sym))
     (define x-stx (datum->stx #f (second pinfo+x-sym) (stx-loc an-expr)))     
     
     ;; predicate: stx
     (define predicate
       (datum->stx #f 
                   (list 'lambda (list x-stx)
                         (list 'equal? x-stx val-stx))
                   (stx-loc an-expr)))
     
     
     ;; loop: (listof stx) (listof stx) stx stx -> stx
     (define (loop list-of-datum answers datum-last answer-last)
       (cond
         [(empty? list-of-datum)
          (if (and (symbol? (stx-e datum-last)) (symbol=? 'else (stx-e datum-last)))
              answer-last
              (datum->stx #f (list (datum->stx #f 'if (stx-loc an-expr))
                                   (datum->stx #f (list (datum->stx #f 'ormap (stx-loc an-expr))
                                                        predicate
                                                        (datum->stx #f (list (datum->stx #f 'quote (stx-loc an-expr))
                                                                             datum-last)
                                                                    (stx-loc an-expr)))
                                               (stx-loc an-expr))
                                   answer-last
                                   (datum->stx #f (list (datum->stx #f 'void (stx-loc an-expr)))
                                               (stx-loc an-expr)))
                          (stx-loc an-expr)))]
         [else
          (cond
            [(not (list? (stx-e (first list-of-datum))))
             (raise (make-moby-error (stx-loc (first list-of-datum))
                                     (make-moby-error-type:generic-syntactic-error
                                      (format "case needs a list of values for each clause, but sees ~s instead"
                                              (stx->datum (first list-of-datum)))
                                      (list))))]
            [else
             (datum->stx #f (list (datum->stx #f 'if (stx-loc an-expr))
                                  (datum->stx #f (list (datum->stx #f 'ormap (stx-loc an-expr))
                                                       predicate
                                                       (datum->stx #f (list (datum->stx #f 'quote (stx-loc an-expr))
                                                                            (first list-of-datum))
                                                                   (stx-loc an-expr)))
                                              (stx-loc an-expr))
                                  (first answers)
                                  (loop (rest list-of-datum)
                                        (rest answers)
                                        datum-last
                                        answer-last))
                         (stx-loc an-expr))])]))]
    
    (begin
      (check-syntax-application! an-expr (lambda (an-expr)
                                           '(case (+ 3 4)
                                              [(6 8)
                                               'unexpected]
                                              [(7)
                                               'ok])))
      (desugar-expression/expr+pinfo
       (deconstruct-clauses-with-else an-expr
                                      (rest (rest (stx-e an-expr)))
                                      (lambda (else-stx)
                                        else-stx)
                                      (lambda (questions answers question-last answer-last)
                                        (list (datum->stx #f 
                                                          (list 'let (list (list val-stx (second (stx-e an-expr))))
                                                                (loop questions answers question-last answer-last))
                                                          (stx-loc an-expr))
                                              updated-pinfo-2)))))))




;; tag-application-operator/module: stx module-name -> stx
;; Adjust the lexical context of the operator so it refers to the environment of a particular module.
(define (tag-application-operator/module an-application-stx a-module-name)
  (local [(define an-id-stx (first (stx-e an-application-stx)))
          (define operands (rest (stx-e an-application-stx)))]
    (datum->stx an-application-stx
                `(,(stx-update-context 
                    an-id-stx
                    (extend-env/module-binding empty-env
                                               (default-module-resolver a-module-name)))
                  ,@operands)
                (stx-loc an-application-stx))))


;; desugar-cond: stx:list -> (list stx:list pinfo)
;; Translates conds to ifs.
(define (desugar-cond an-expr pinfo)
  (begin
    (check-syntax-application! an-expr (lambda (expr) 
                                         '(cond [(even? 42) 'ok]
                                                [(odd? 42) 'huh?])))
    (local
      [(define cond-symbol (first (stx-e an-expr)))
       (define cond-clauses (rest (stx-e an-expr)))
       (define expr-locs (list (stx-loc (first (stx-e an-expr)))
                               (make-Loc (Loc-offset (stx-loc an-expr))
                                         (Loc-line (stx-loc an-expr))
                                         (Loc-column (stx-loc an-expr))
                                         1
                                         (Loc-id (stx-loc an-expr)))
                               (make-Loc (+ (Loc-offset (stx-loc an-expr)) (Loc-span (stx-loc an-expr)) -1)
                                         (Loc-line (stx-loc an-expr))
                                         (+ (Loc-column (stx-loc an-expr)) (Loc-span (stx-loc an-expr)) -1)
                                         1
                                         (Loc-id (stx-loc an-expr)))))
       (define (check-clause-structures!)
         (for-each (lambda (a-clause)
                     (let ((cond-branch-locs (list (make-Loc (Loc-offset (stx-loc a-clause))
                                                             (Loc-line (stx-loc a-clause))
                                                             (Loc-column (stx-loc a-clause))
                                                             1
                                                             (Loc-id (stx-loc a-clause)))
                                                   (make-Loc (+ (Loc-offset (stx-loc a-clause)) (Loc-span (stx-loc a-clause)) -1)
                                                             (Loc-line (stx-loc a-clause))
                                                             (+ (Loc-column (stx-loc a-clause)) (Loc-span (stx-loc a-clause)) -1)
                                                             1
                                                             (Loc-id (stx-loc a-clause))))))
                       (cond [(not (list? (stx-e a-clause)))
                              (raise (make-moby-error (stx-loc a-clause)  ;;conditional-malformed-clause
                                                      (make-Message 
                                                       (make-MultiPart "cond" expr-locs #t) 
                                                       ": expected a clause with a question and an answer, but found "
                                                       (make-ColoredPart "something else" (stx-loc a-clause)))))]
                             [(= (length (stx-e a-clause)) 0)
                              (raise (make-moby-error (stx-loc a-clause)   ;;conditional-clause-too-few-elements
                                                      (make-Message 
                                                       (make-MultiPart "cond" expr-locs #t)  
                                                       ": expected a clause with a question and an answer, but found an "
                                                       (make-MultiPart "empty part" cond-branch-locs #t)
                                                       )))]
                             [(< (length (stx-e a-clause)) 2)
                              (raise (make-moby-error (stx-loc a-clause)   ;;conditional-clause-too-few-elements
                                                      (make-Message 
                                                       (make-MultiPart "cond" expr-locs #t)
                                                       ": expected a clause with a question and an answer, but found a "
                                                       (make-MultiPart "clause" cond-branch-locs #t)
                                                       " with only "
                                                       (make-MultiPart "one part" (map stx-loc (stx-e a-clause)) #f))))]                 
                             [(> (length (stx-e a-clause)) 2)
                              
                              (raise (make-moby-error (stx-loc a-clause) ;;conditional-clause-too-many-elements
                                                      (make-Message 
                                                       (make-MultiPart "cond" expr-locs #t) 
                                                       ": expected a clause with a question and an answer, but found " 
                                                       (make-MultiPart "a clause" cond-branch-locs #t)
                                                       " with "
                                                       (make-MultiPart (string-append (number->string (length (stx-e a-clause))) " parts") (map stx-loc (stx-e a-clause)) #f))))]
                             [else
                              (void)])))
                   cond-clauses))
       
       
       ;; loop: (listof stx) (listof stx) stx stx pinfo -> (list stx pinfo)
       (define (loop questions answers question-last answer-last pinfo)
         (cond
           [(empty? questions)
            (let* ([desugared-last-question+pinfo 
                    (desugar-expression question-last pinfo)]
                   [desugared-last-answer+pinfo 
                    (desugar-expression answer-last (second desugared-last-question+pinfo))])

              (list (datum->stx #f `(if ,(force-boolean-context cond-symbol (first desugared-last-question+pinfo))
                                        ,(first desugared-last-answer+pinfo)
                                        ,(make-cond-exhausted-expression (stx-loc an-expr)))
                                (stx-loc an-expr))
                   (second desugared-last-answer+pinfo)))]
           
           [else
            (let* ([desugared-first-question+pinfo 
                    (desugar-expression (first questions) pinfo)]
                   [desugared-first-answer+pinfo
                    (desugar-expression (first answers)
                                        (second desugared-first-question+pinfo))]
                   [desugared-rest+pinfo (loop (rest questions)
                                               (rest answers)
                                               question-last
                                               answer-last
                                               (second desugared-first-answer+pinfo))])
              (list (datum->stx #f `(if ,(force-boolean-context cond-symbol (first desugared-first-question+pinfo))
                                        ,(first desugared-first-answer+pinfo)
                                        ,(first desugared-rest+pinfo))
                                (stx-loc an-expr))
                    (second desugared-rest+pinfo)))]))]
       (cond
        [(empty? cond-clauses)
         (raise (make-moby-error (stx-loc an-expr)  ;;conditional-missing-question-answer
                                 (make-Message 
                                  (make-ColoredPart "cond" (stx-loc (first (stx-e an-expr))))
                                  ": expected at least one clause after cond, but nothing's there")))]
        [else
         (begin
           (check-clause-structures!)
           (deconstruct-clauses-with-else an-expr
                                           cond-clauses
                                           (lambda (else-stx)
                                             (datum->stx #f 'true (stx-loc else-stx)))
                                           (lambda (questions answers question-last answer-last)
                                             (loop questions answers question-last answer-last pinfo))))]))))


;; check-syntax-application!: stx (stx -> void) -> void
;; Checks that the expression from is being applied rather than be used as a simple
;; identifier.  If we see a violation, raise make-moby-error-type:syntax-not-applied.
(define (check-syntax-application! expr on-failure)
  (cond
    [(pair? (stx-e expr))
     (void)]
    [(symbol? (stx-e expr))
     (cond
      [(eq? (stx-e expr) 'else)
       (raise (make-moby-error (stx-loc expr)
                               (make-Message (make-ColoredPart (symbol->string (stx-e expr)) (stx-loc expr))
                                             ": not allowed "
                                             (make-ColoredPart "here" (stx-loc expr))
                                             " because this is not a question in a clause")))]
      [else
       (raise (make-moby-error (stx-loc expr)
                               (make-Message (make-ColoredPart (symbol->string (stx-e expr)) (stx-loc expr))
                                             ": expected an open parenthesis before "
                                             (symbol->string (stx-e expr))
                                             ", but found none")))])]
    [else
     (raise (make-moby-error (stx-loc expr)
                             (make-moby-error-type:unsupported-expression-form expr)))]))


;; check-syntax-application-arity!: expression number (stx -> void) -> void
;; Make sure the syntax application has at least the following number of arguments. 
(define (check-syntax-application-arity-at-least! expr expected-arity on-failure)
  (cond
    [(> (length (stx-e expr)) expected-arity)
     (void)]
    [else
     ;;the error given is not the right one
     #;(raise (make-moby-error (stx-loc expr)
                             (make-moby-error-type:syntax-not-applied
                              expr
                              (on-failure expr))))
     (raise (make-moby-error (stx-loc expr)
                             (make-Message
                              (make-ColoredPart (symbol->string (stx-e (first (stx-e expr))))
                                                (stx-loc (first (stx-e expr))))
                              ": expected an expression after the bindings, but nothing's there")))]))

;; make-cond-exhausted-expression: loc -> stx
(define (make-cond-exhausted-expression a-loc)
  (tag-application-operator/module
   (datum->stx #f `(throw-cond-exhausted-error (quote ,(loc->vec a-loc))) a-loc)
   'moby/runtime/kernel/misc))


;; deconstruct-clauses-with-else: (listof stx) (listof stx) (stx -> stx) ((listof stx) (listof stx) stx stx -> X) -> X
;; Helper for functions that need to destruct a list of 
;; clauses of the form ([question answer] ... [else answer-last]).
(define (deconstruct-clauses-with-else an-expr clauses else-replacement-f f)
  (local 
    [;; process-clauses: (listof stx) (listof stx) (listof stx) -> X
     (define (process-clauses clauses questions/rev answers/rev)
       (cond
         [(stx-begins-with? (first clauses) 'else)
          (begin
            (if (not (empty? (rest clauses)))
                (let ((expr-locs (list (stx-loc (first (stx-e an-expr)))
                                       (make-Loc (Loc-offset (stx-loc an-expr))
                                                 (Loc-line (stx-loc an-expr))
                                                 (Loc-column (stx-loc an-expr))
                                                 1
                                                 (Loc-id (stx-loc an-expr)))
                                       (make-Loc (+ (Loc-offset (stx-loc an-expr)) (Loc-span (stx-loc an-expr)) -1)
                                                 (Loc-line (stx-loc an-expr))
                                                 (+ (Loc-column (stx-loc an-expr)) (Loc-span (stx-loc an-expr)) -1)
                                                 1
                                                 (Loc-id (stx-loc an-expr))))))
                  (raise (make-moby-error (stx-loc (first clauses))
                                          (make-Message 
                                           (make-MultiPart "cond" expr-locs #t) ": " 
                                           "found an "
                                           (make-ColoredPart "else clause" (stx-loc (first clauses))) 
                                           " that isn't the last clause in its cond expression; there is "
                                           (make-ColoredPart "another clause" (stx-loc (second clauses))) 
                                           " after it"                                      
                                           ))))
                (f (reverse questions/rev) 
                   (reverse answers/rev) 
                   (else-replacement-f (first (stx-e (first clauses))))
                   (second (stx-e (first clauses))))))]
         
         [(empty? (rest clauses))
          (f (reverse questions/rev)
             (reverse answers/rev) 
             (first (stx-e (first clauses)))
             (second (stx-e (first clauses))))]
         [else
          (process-clauses (rest clauses)
                           (cons (first (stx-e (first clauses))) questions/rev) 
                           (cons (second (stx-e (first clauses))) answers/rev))]))]
    (process-clauses clauses empty empty)))




;; desugar-let: expr-stx -> (list expr-stx pinfo)
;; Given a let expression, translates it to the equivalent use of
;; a lambda application.
(define (desugar-let a-stx pinfo)
  (begin    
    (check-syntax-application! a-stx (lambda (a-stx)
                                       '(let ([x 3]
                                              [y 4])
                                          (+ x y))))
    
    (when (= (length (stx-e a-stx)) 1)
      (raise (make-moby-error (stx-loc a-stx)
                              (make-Message 
                               (make-ColoredPart "let" (stx-loc (first (stx-e a-stx))))
                               ": expected at least one binding (in parentheses) after let, but nothing's there"))))
    
    (check-list-of-key-value-pairs! (second (stx-e a-stx)) a-stx)
    (check-single-body-stx! (rest (rest (stx-e a-stx))) a-stx)
    
    (local [(define clauses-stx (second (stx-e a-stx)))
            (define body-stx (third (stx-e a-stx)))
            (define ids (map (lambda (clause)
                               (first (stx-e clause)))
                             (stx-e clauses-stx)))
            (define vals (map (lambda (clause)
                                (second (stx-e clause)))
                              (stx-e clauses-stx)))
            
            (define new-lambda-stx
              (datum->stx #f (list (datum->stx #f 'lambda (stx-loc a-stx))
                                   (datum->stx #f ids (stx-loc a-stx))
                                   body-stx)
                          (stx-loc a-stx)))]    
      (begin
        
        (check-duplicate-identifiers! (map (lambda (a-clause)
                                             (first (stx-e a-clause)))
                                           (stx-e clauses-stx))
                                      (first (stx-e a-stx)))      
        (desugar-expression/expr+pinfo 
         (list (datum->stx #f (cons new-lambda-stx vals)
                           (stx-loc a-stx))
               pinfo))))))


;; check-list-of-key-value-pairs!: stx -> void
(define (check-list-of-key-value-pairs! stx original-stx)
  (cond
    [(not (list? (stx-e stx)))
     (raise (make-moby-error (stx-loc stx)
                             (make-Message 
                              (make-ColoredPart (symbol->string (stx-e (first (stx-e original-stx))))
                                                (stx-loc (first (stx-e original-stx))))
                              ": expected sequence of key value pairs, but given "
                              (make-ColoredPart "something else"
                                                (stx-loc stx)))))]
                             
    [else
     (for-each (lambda (maybe-kv-stx)
                 (cond [(or (not (list? (stx-e maybe-kv-stx)))
                            (not (= (length (stx-e maybe-kv-stx)) 2))
                            (not (symbol? (stx-e (first (stx-e maybe-kv-stx))))))
                        (raise (make-moby-error (stx-loc maybe-kv-stx)
                                                (make-Message
                                                 (make-ColoredPart (symbol->string (stx-e (first (stx-e original-stx))))
                                                                   (stx-loc (first (stx-e original-stx))))
                                                 ": expected a key/value pair, but given "
                                                 (make-ColoredPart "something else"
                                                                   (stx-loc maybe-kv-stx)))))]
                       [else
                        (void)]))
               (stx-e stx))]))



;; desugar-let*: expr-stx -> expr-stx
;; Desugars let* into a nested bunch of let expressions.
(define (desugar-let* a-stx pinfo)
  (begin
    (check-syntax-application! a-stx (lambda (a-stx)
                                       '(let* ([x 3]
                                               [y 4])
                                          (+ x y))))
    (check-syntax-application-arity-at-least! a-stx 2 
                                              (lambda (a-stx)
                                                '(let* ([x 3]
                                                        [y 4])
                                                   (+ x y))))
    (check-list-of-key-value-pairs! (second (stx-e a-stx)) a-stx)
    (local [(define clauses-stx (second (stx-e a-stx)))
            (define body-stx (third (stx-e a-stx)))
            
            ;; loop: (listof stx) -> stx
            (define (loop clauses)
              (cond
                [(empty? clauses)
                 body-stx]
                [else
                 (datum->stx #f (list (datum->stx #f 'let (stx-loc (first clauses)))
                                      (datum->stx #f (list (first clauses))
                                                  (stx-loc (first clauses)))
                                      (loop (rest clauses)))
                             (stx-loc (first clauses)))]))]    
      (begin
        (check-single-body-stx! (rest (rest (stx-e a-stx))) a-stx)
        (desugar-expression/expr+pinfo 
         (list (loop (stx-e clauses-stx))
               pinfo))))))


;; desugar-letrec: stx pinfo -> (list stx pinfo)
;; Letrec will be desugared into local.
(define (desugar-letrec a-stx pinfo)
  (begin
    (check-syntax-application! a-stx (lambda (a-stx)
                                       '(letrec ([f (lambda (x) 
                                                      (if (= x 0)
                                                          1
                                                          (* x (f (- x 1)))))])
                                          (f 3))))
    (check-syntax-application-arity-at-least! a-stx 
                                              2
                                              (lambda (a-stx)
                                                '(letrec ([f (lambda (x) 
                                                               (if (= x 0)
                                                                   1
                                                                   (* x (f (- x 1)))))])
                                                   (f 3))))
    (check-list-of-key-value-pairs! (second (stx-e a-stx)) a-stx)
    (local [(define clauses-stx (second (stx-e a-stx)))
            (define body-stx (third (stx-e a-stx)))
            (define define-clauses
              (map (lambda (a-clause)
                     (local [(define name (first (stx-e a-clause)))
                             (define val (second (stx-e a-clause)))]
                       (datum->stx #f (list 'define name val)
                                   (stx-loc a-clause))))
                   (stx-e clauses-stx)))]
      (begin
        (check-single-body-stx! (rest (rest (stx-e a-stx))) a-stx)
        (check-duplicate-identifiers! (map (lambda (a-clause) (first (stx-e a-clause)))
                                           (stx-e clauses-stx))
                                      (first (stx-e a-stx)))
        (desugar-expression/expr+pinfo 
         (list (datum->stx #f 
                           (list 'local define-clauses body-stx)
                           (stx-loc a-stx))
               pinfo))))))


;; check-single-argument-form!: stx (-> moby-error-type) (-> moby-error-type) -> void
(define (check-single-argument-form! a-stx 
                                     make-error-type:too-few-elements 
                                     make-error-type:too-many-elements)
  (cond [(< (length (stx-e a-stx)) 2)
         (raise (make-moby-error (stx-loc a-stx)
                                 (make-error-type:too-few-elements)))]
        [(> (length (stx-e a-stx)) 2)
         (raise (make-moby-error (stx-loc a-stx)
                                 (make-error-type:too-many-elements)))]
        [else
         (void)]))



;; desugar-quasiquote: stx pinfo -> (list stx pinfo)
(define (desugar-quasiquote a-stx pinfo)
  (local [;; handle-quoted: stx depth -> stx
          (define (handle-quoted a-stx depth)
            (cond
              [(stx:list? a-stx)
               (cond [(stx-begins-with? a-stx 'quasiquote)
                      (begin 
                        (cond
                          [(> depth 0)
                           (datum->stx #f (cons 'list
                                                (cons 
                                                 ''quasiquote 
                                                 (map (lambda (x) (handle-quoted x (add1 depth)))
                                                      (rest (stx-e a-stx)))))
                                       (stx-loc a-stx))]
                          [else
                           (begin
                             (check-single-argument-form! a-stx 
                                                          make-moby-error-type:quasiquote-too-few-elements
                                                          make-moby-error-type:quasiquote-too-many-elements)
                             (handle-quoted (second (stx-e a-stx))
                                            (add1 depth)))]))]
                     
                     [(stx-begins-with? a-stx 'unquote)
                      (begin
                        (cond
                          [(> depth 1)
                           (datum->stx #f (cons 'list
                                                (cons ''unquote
                                                      (map (lambda (x)
                                                             (handle-quoted x (sub1 depth)))
                                                           (rest (stx-e a-stx)))))
                                       (stx-loc a-stx))]
                          [(= depth 1)
                           (begin
                             (check-single-argument-form! a-stx 
                                                          make-moby-error-type:unquote-too-few-elements
                                                          make-moby-error-type:unquote-too-many-elements)
                             (second (stx-e a-stx)))]
                          [else
                           (raise (make-moby-error (stx-loc a-stx)
                                                   (make-moby-error-type:generic-syntactic-error
                                                    "misuse of a comma or 'unquote, not under a quasiquoting backquote" 
                                                    (list)
                                                    )))]))]
                     
                     [(stx-begins-with? a-stx 'unquote-splicing)
                      (cond
                        [(> depth 1)
                         (begin
                           (datum->stx #f 
                                       (cons 'list 
                                             (cons ''unquote-splicing 
                                                   (map (lambda (x) (handle-quoted x (sub1 depth)))
                                                        (rest (stx-e a-stx)))))
                                       (stx-loc a-stx)))]
                        [(= depth 1)
                         (raise (make-moby-error (stx-loc a-stx)
                                                 (make-moby-error-type:generic-syntactic-error
                                                  "misuse of ,@ or unquote-splicing within a quasiquoting backquote" 
                                                  (list))))]
                        [else
                         (raise (make-moby-error (stx-loc a-stx)
                                                 (make-moby-error-type:generic-syntactic-error
                                                  "misuse of a ,@ or unquote-splicing, not under a quasiquoting backquote"
                                                  (list))))])]                     
                     [else
                      (datum->stx #f (cons 'append 
                                           (map 
                                            ;; (stx -> (listof stx))
                                            (lambda (s) 
                                              (cond
                                                [(stx-begins-with? s 'quasiquote)
                                                 (list 'list (handle-quoted s depth))]
                                                
                                                [(stx-begins-with? s 'unquote)
                                                 (list 'list (handle-quoted s depth))]
                                                
                                                [(stx-begins-with? s 'unquote-splicing)
                                                 (cond
                                                   [(> depth 1)
                                                    (list 'list (handle-quoted s depth))]
                                                   [(= depth 1)
                                                    (begin
                                                      (check-single-argument-form! 
                                                       s
                                                       make-moby-error-type:unquote-splicing-too-few-elements
                                                       make-moby-error-type:unquote-splicing-too-many-elements)
                                                      (second (stx-e s)))]
                                                   [else
                                                    (raise
                                                     (make-moby-error 
                                                      (stx-loc a-stx)
                                                      (make-moby-error-type:generic-syntactic-error
                                                       "misuse of ,@ or unquote-splicing within a quasiquoting backquote" 
                                                       (list))))])]
                                                
                                                [else
                                                 (list 'list (handle-quoted s depth))]))
                                            (stx-e a-stx)))
                                  (stx-loc a-stx))])]
              [else
               (cond
                 [(> depth 0)
                  (datum->stx #f (list 'quote a-stx) (stx-loc a-stx))]
                 [else
                  a-stx])]))]
    (begin
      (check-syntax-application! a-stx (lambda (a-stx)
                                         '(quasiquote x)))
      (desugar-expression/expr+pinfo 
       (list (handle-quoted a-stx 0) 
             pinfo)))))



;; desugar-quote: expr pinfo -> (list expr pinfo)
(define (desugar-quote expr pinfo)
  (begin
    (check-syntax-application! expr (lambda (expr) 
                                      `(quote i-am-a-symbol)))
    (cond
      [(< (length (stx-e expr)) 2)
       (raise (make-moby-error (stx-loc expr)
                               (make-Message (make-ColoredPart "quote" (stx-loc (first (stx-e expr))))
                                             ": expected a single argument, but did not find one.")))]
      [(> (length (stx-e expr)) 2)
       (raise (make-moby-error (stx-loc expr)
                               (make-Message (make-ColoredPart "quote" (stx-loc (first (stx-e expr))))
                                             ": expected a single argument, but found "
                                             (make-MultiPart "more than one." (map stx-loc (rest (stx-e expr))) #f))))]
      [else
       (list expr pinfo)])))



;; provide/contract-statement: stx -> boolean
(define (provide/contract-statement? a-stx)
  (stx-begins-with? a-stx 'provide/contract))


;; replace-provide/contracts: stx pinfo -> (list (listof stx) pinfo)
;; Rewrites all the provide/contracts to regular provides, since we don't
;; yet have a contract system in place.
(define (desugar-provide/contract a-provide-contract a-pinfo)
  (cond [(stx-begins-with? a-provide-contract 'provide/contract)
         (list (list (datum->stx #f 
                                 `(provide ,@(map convert-provide/contract-clause 
                                                  (rest (stx-e a-provide-contract)))) 
                                 (stx-loc a-provide-contract)))
               a-pinfo)]
        [else
         (list (list a-provide-contract) 
               a-pinfo)]))


;; convert-provide/contract-clause: stx -> stx
(define (convert-provide/contract-clause a-clause)
  (cond
    [(stx-begins-with? a-clause 'struct)
     ;; FIXME: Check all syntactic conditions for well-formedness!
     (datum->stx #f 
                 `(struct-out ,(first (rest (stx-e a-clause))))
                 (stx-loc a-clause))]
    [(list? (stx-e a-clause))
     ;; FIXME: we're ignoring the contract.
     (first (stx-e a-clause))]
    [(symbol? (stx-e a-clause))
     a-clause]
    [else
     (raise (make-moby-error (stx-loc a-clause)
                             (make-moby-error-type:generic-syntactic-error 
                              (format "provide/contract: ~s" a-clause)
                              (list))))]))




(define THE-DEFAULT-SYNTACTIC-ENVIRONMENT (make-default-syntax-env))


(provide/contract
 [desugar-program (program? pinfo? . -> . (list/c program? pinfo?))]
 [tag-application-operator/module (stx? symbol? . -> . stx?)]) 
