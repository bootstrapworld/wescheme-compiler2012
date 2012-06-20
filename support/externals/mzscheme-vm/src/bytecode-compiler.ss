#lang scheme/base

(require scheme/match
         scheme/contract
         scheme/list
         "bytecode-structs.ss"
         "jsexp.ss"
         "primitive-table.ss"
         (prefix-in internal: compiler/zo-parse))


(provide/contract [compile-top (compilation-top? . -> . any/c)])


;; The structure of the code follows the type definitions in:
;; http://docs.plt-scheme.org/mzc/decompile.html?q=zo-parse#(def._((lib._compiler/zo-parse..ss)._indirect~3f))


;; Global parameters.
;; seen-indirects: maps the closures's symbolic identifiers to lambdas.
(define seen-indirects (make-parameter (make-hasheq)))



;; compile-top: top -> jsexp
(define (compile-top a-top)
  (parameterize ([seen-indirects (make-hasheq)])
    (match a-top
      [(struct compilation-top (max-let-depth prefix code))
       (let* ([compiled-code (compile-at-form-position code)]
              ;; WARNING: Order dependent!  We need compile-code to run first
              ;; since it initializes the seen-indirects parameter.
              [compiled-indirects (emit-indirects)])
         (void)
         (make-ht 'compilation-top
                  `((max-let-depth ,(make-int max-let-depth))
                    (prefix ,(compile-prefix prefix))
                    (compiled-indirects ,compiled-indirects)
                    (code ,compiled-code))))])))


;; emit-indirects: -> jsexp
;; Writes out all the indirect lambdas that we've seen.
(define (emit-indirects)
  (let ([ht (seen-indirects)])
    (make-vec 
     (for/list ([id+lam (in-hash-pairs ht)])
       (make-ht 'labeled-indirect 
                `((id ,(make-lit (car id+lam)))
                  (lam ,(compile-lam (cdr id+lam)))))))))


;; compile-prefix: prefix -> jsexp
(define (compile-prefix a-prefix)
  (match a-prefix
    [(struct prefix (num-lifts toplevels stxs))
     ;; FIXME: handle stxs?
     (make-ht 'prefix 
              `((num-lifts ,(make-int num-lifts))
                (toplevels ,(compile-toplevels toplevels))
                (stxs ,(compile-stxs stxs))))]))


;; compile-toplevels: (listof (or/c #f symbol? global-bucket? module-variable?)) -> jsexp
(define (compile-toplevels toplevels)
  (make-vec (map (lambda (a-toplevel)
                   (cond
                     [(eq? a-toplevel #f) 
                      (make-lit #f)]
                     [(symbol? a-toplevel)
                      (make-lit a-toplevel)]
                     [(global-bucket? a-toplevel) 
                      (make-ht 'global-bucket 
                               `((value ,(make-lit (symbol->string (global-bucket-name a-toplevel))))))]
                     [(module-variable? a-toplevel)
                      (compile-module-variable a-toplevel)]))
                 toplevels)))

(define (compile-module-variable a-module-variable)
  (match a-module-variable
    [(struct module-variable (modidx sym pos phase))
     (make-ht 'module-variable `((sym ,(make-lit sym))
                                 (modidx ,(compile-module-path-index modidx))
                                 (pos ,(make-lit pos))
                                 (phase ,(make-lit phase))))]))




;; compile-stxs: (listof stx) -> jsexp
(define (compile-stxs stxs)
  (make-vec (map (lambda (a-stx)
                   ;; FIXME: not right.  We need to translate
                   ;; stxs to runtime values eventually to support
                   ;; topsyntax
                   (make-lit (format "~s" stxs)))
                 stxs)))


;; compile-code: code -> jsexp
(define (compile-code a-code)
  (match a-code
    [(? form?)
     (compile-form a-code)]
    [(? indirect?)
     (compile-indirect a-code)]
    [else
     ;; literal value is self-evaluating
     (compile-constant a-code)]))


;; compile-constant: datum -> jsexp
(define (compile-constant a-constant)
  (make-ht 'constant 
           `((value ,(make-lit a-constant)))))



;; compile-form: form -> jsexp
(define (compile-form a-form)
  (match a-form
    [(? def-values?)
     (compile-def-values a-form)]
    [(? req?)
     (compile-req a-form)]
    [(? seq?)
     (compile-seq a-form)]
    [(? splice?)
     (compile-splice a-form)]
    [(? mod?)
     (compile-mod a-form)]
    [(? expr?)
     (compile-expr a-form)]))


;; compile-mod: mod -> jsexp
(define (compile-mod a-mod)
  (match a-mod
    [(struct mod (name
                  self-modidx
                  prefix
                  provides
                  requires
                  body
                  syntax-body
                  unexported
                  max-let-depth
                  dummy
                  lang-info
                  internal-context))
     (make-ht 'mod `((name ,(make-lit name))
                     (requires ,(compile-requires requires))
                     (prefix ,(compile-prefix prefix))
                     (body ,(make-vec (map compile-at-form-position
                                           body)))))]))

(define (compile-requires requires)
  (make-vec (map (lambda (a-require)
                   (make-vec (cons (make-lit (first a-require))
                                   (map compile-module-path-index (rest a-require)))))
                 requires)))
       


(define (compile-module-path-index mpi)
  (let-values ([(mpath base)
                (module-path-index-split mpi)])
    (make-ht 'module-path `((path ,(make-lit (cond 
                                               [(module-path? mpath) 
                                                mpath]
                                               [else #f])))
                            (base ,(cond 
                                     [(module-path-index? base)
                                      (compile-module-path-index base)]
                                     [(resolved-module-path? base)
                                      (compile-resolved-module-path base)]
                                     [else
                                        (make-lit #f)]
                                       ))))))


(define (compile-resolved-module-path rmp)
  (let ([pathname (resolved-module-path-name rmp)])
    (make-ht 'resolved-module-path `((path ,(make-lit (cond [(path? pathname)
                                                             (path->string pathname)]
                                                            [else
                                                             pathname])))))))




;; compile-splice: splice -> jsexp
(define (compile-splice a-splice)
  (match a-splice
    [(struct splice (forms))
     (make-ht 'splice `((value
                         ,(make-vec (map compile-at-form-position
                                         forms)))))]))




;; compile-at-expression-position: (U expr seq indirect any) -> jsexp
;;
;; evaluate the expression-like thing at x, installing it into the retvals of
;; the current state.
(define (compile-at-expression-position x)
  (match x
    [(? expr?)
     (compile-expr x)]
    [(? seq?)
     (compile-seq x)]
    [(? indirect?)
     (compile-indirect x)]
    [else
     (compile-constant x)]))


(define (compile-at-form-position x)
  (match x
    [(? form?)
     (compile-form x)]
    [(? indirect? x)
     (compile-indirect x)]
    [else
     (compile-constant x)]))



;; compile-def-values: def-values -> jsexp
;; Accumulates the values for rhs, and then installs each value in turn
;; into the toplevel.
(define (compile-def-values a-def-values)
  (match a-def-values
    [(struct def-values (ids rhs))
     (make-ht 'def-values 
              `((ids ,(make-vec 
                       (map compile-toplevel ids)))
                (body ,(compile-at-expression-position rhs))))]))


;                                          
;                                          
;                                          
;                                          
;                                          
;                                          
;     ;;;;    ;;    ;   ;;;;;;      ; ;;;; 
;    ;;  ;;    ;;  ;;   ;;;  ;;     ;;;    
;   ;;    ;     ; ;;    ;;    ;     ;;     
;   ;;    ;;    ;;;     ;;    ;;    ;      
;   ;;;;;;;;     ;;     ;;    ;;    ;      
;   ;;          ;;;;    ;;    ;;    ;      
;   ;;         ;;  ;    ;;    ;     ;      
;    ;;   ;    ;   ;;   ;;;  ;;     ;      
;     ;;;;;   ;;    ;;  ;; ;;;      ;      
;                       ;;                 
;                       ;;                 
;                       ;;                 
;                                  ;       


;; compile-expr: expr -> jsexp
(define (compile-expr an-expr)
  (match an-expr
    [(? lam?)
     (compile-lam an-expr)]
    [(? case-lam?)
     (compile-case-lam an-expr)]
    [(? localref?)
     (compile-localref an-expr)]
    [(? toplevel?)
     (compile-toplevel an-expr)]
    [(? application?)
     (compile-application an-expr)]
    [(? apply-values?)
     (compile-apply-values an-expr)]
    [(? primval?)
     (compile-primval an-expr)]
    [(? branch?)
     (compile-branch an-expr)]
    [(? closure?)
     (compile-closure an-expr)]
    [(? beg0?)
     (compile-beg0 an-expr)]
    [(? with-cont-mark?)
     (compile-with-cont-mark an-expr)]
    [(? let-one?)
     (compile-let-one an-expr)]
    [(? let-void?)
     (compile-let-void an-expr)]
    [(? let-rec?)
     (compile-let-rec an-expr)]
    [(? indirect?)
     (compile-indirect an-expr)]
    [(? install-value?)
     (compile-install-value an-expr)]
    [(? assign?)
     (compile-assign an-expr)]
    [(? varref?)
     (compile-varref an-expr)]
    [(? boxenv?)
     (compile-boxenv an-expr)]
    [(? topsyntax?)
     (compile-topsyntax an-expr)]))


;; compile-lam: lam -> jsexp
(define (compile-lam a-lam)
  (match a-lam
    [(struct lam (name flags num-params param-types 
                       rest? closure-map closure-types 
                       max-let-depth body))
     (make-ht 'lam `((name ,(make-lit name))
		     (flags ,(make-vec (map make-lit flags)))
                     (num-params ,(make-int num-params))
                     (param-types ,(make-vec (map make-lit param-types)))
                     (rest? ,(make-lit rest?))
                     (closure-map ,(make-vec (map make-lit (vector->list closure-map))))
                     (closure-types ,(make-vec (map make-lit closure-types)))
                     (max-let-depth ,(make-int max-let-depth))
                     (body ,(compile-at-expression-position body))))]))


;; compile-case-lam: case-lam -> jsexp
(define (compile-case-lam a-case-lam)
  (match a-case-lam
    [(struct case-lam (name clauses))
     (make-ht 'case-lam `((name ,(make-lit name))
                          (clauses ,(make-vec (map compile-lam clauses)))))]))
              


;; compile-closure: closure -> jsexp
(define (compile-closure a-closure)
  (match a-closure 
    [(struct closure (lam gen-id))
     (begin
       (hash-set! (seen-indirects) gen-id lam)
       (make-ht 'closure `((lam ,(compile-lam lam))
                           (gen-id ,(make-lit gen-id)))))]))


;; compile-indirect: indirect -> jsexp
(define (compile-indirect an-indirect)
  (match an-indirect
    [(struct indirect ((struct closure (lam gen-id))))
     (begin
       ;; Keep track of the indirect.  We'll need to generate the s-expression for it in a moment
       (hash-set! (seen-indirects) gen-id lam)
       (make-ht 'indirect `((value ,(make-lit gen-id)))))]))



;; compile-localref: localref -> jsexp
(define (compile-localref a-localref)
  (match a-localref
    [(struct localref (unbox? pos clear? other-clears? flonum?))
     (make-ht 'localref `((unbox? ,(make-lit unbox?))
                          (pos ,(make-int pos))
                          (clear ,(make-lit clear?))
                          (other-clears? ,(make-lit other-clears?))
                          (flonum? ,(make-lit flonum?))))]))


;; compile-toplevel: toplevel -> jsexp
(define (compile-toplevel a-toplevel)
  (match a-toplevel
    [(struct toplevel (depth pos const? ready?))
     (make-ht 'toplevel `((depth ,(make-int depth))
                          (pos ,(make-int pos))
                          (const? ,(make-lit const?))
                          (ready? ,(make-lit ready?))))]))


;; compile-application: application -> jsexp
(define (compile-application an-application)
  (match an-application
    [(struct application (rator rands))
     (make-ht 'application 
              `((rator ,(compile-at-expression-position rator))
                (rands ,(make-vec (map compile-at-expression-position rands)))))]))


;; compile-apply-values: apply-values -> jsexp
(define (compile-apply-values an-apply-values)
  (match an-apply-values
    [(struct apply-values (proc args-expr))
     (make-ht 'apply-values 
              `((proc ,(compile-at-expression-position proc))
                (args-expr ,(compile-at-expression-position args-expr))))]))


;; compile-primval: primval jsexp -> jsexp
(define (compile-primval a-primval)
  (match a-primval
    [(struct primval (id))
     (make-ht 'primval `((value ,(make-lit 
                                  (symbol->string (hash-ref primitive-table id))))))]))


;; compile-branch: branch -> jsexp
(define (compile-branch a-branch)
  (match a-branch
    [(struct branch (test then else))
     (make-ht 'branch `((test ,(compile-at-expression-position test))
			(then ,(compile-at-expression-position then))
			(else ,(compile-at-expression-position else))))]))




;; compile-req: req -> jsexp
(define (compile-req a-seq)
  (match a-seq
    [(struct req (path toplevel))
     (make-ht 'req 
              `((reqs ,(make-lit (syntax->datum path)))
		(dummy ,(compile-toplevel toplevel))))]))



;; compile-seq: seq -> jsexp
(define (compile-seq a-seq)
  (match a-seq
    [(struct seq (forms))
     (make-ht 'seq 
              `((forms 
                 ,(make-vec 
                   (map compile-at-form-position forms)))))]))


;; compile-beg0: seq -> jsexp
(define (compile-beg0 a-beg0)
  (match a-beg0
    [(struct beg0 (seq))
     (make-ht 'beg0 
              `((seq 
                 ,(make-vec 
                   (map compile-at-expression-position seq)))))]))


;; compile-with-cont-mark: cont-mark -> jsexp
(define (compile-with-cont-mark a-with-cont-mark)
  (match a-with-cont-mark
    [(struct with-cont-mark (key val body))
     (make-ht 'with-cont-mark 
              `((key ,(compile-at-expression-position key))
                (val ,(compile-at-expression-position val))
                (body ,(compile-at-expression-position body))))]))


;; compile-let-one: let-one -> jsexp
(define (compile-let-one a-let-one)
  (match a-let-one
    [(struct let-one (rhs body flonum?))
     (make-ht 'let-one 
              `((rhs ,(compile-at-expression-position rhs))
                (body ,(compile-at-expression-position body))
                (flonum? ,(make-lit flonum?))))]))


;; compile-let-void: let-void -> jsexp
(define (compile-let-void a-let-void)
  (match a-let-void
    [(struct let-void (count boxes? body))
     (make-ht 'let-void 
              `((count ,(make-int count))
                (boxes? ,(make-lit boxes?))
                (body ,(compile-at-expression-position body))))]))
             

;; compile-let-rec: let-rec -> jsexp
(define (compile-let-rec a-let-rec)
  (match a-let-rec
    [(struct let-rec (procs body))
     (make-ht 'let-rec `((procs ,(make-vec (map compile-lam procs)))
                         (body ,(compile-at-expression-position body))))]))
  

;; compile-install-value: install-value -> jsexp
(define (compile-install-value an-install-value)
  (match an-install-value
    [(struct install-value (count pos boxes? rhs body))
     (make-ht 'install-value `((count ,(make-int count))
                               (pos ,(make-int pos))
                               (boxes? ,(make-lit boxes?))
                               (rhs ,(compile-at-expression-position rhs))
                               (body ,(compile-at-expression-position body))))]))

;; compile-varref: varref -> jsexp
(define (compile-varref a-varref)
  (match a-varref
    [(struct varref (toplevel))
     (make-ht 'varref `((toplevel ,(compile-toplevel toplevel))))]))


;; compile-assign: assign -> jsexp
(define (compile-assign an-assign)
  (match an-assign
    [(struct assign (id rhs undef-ok?))
     (make-ht 'assign `((id ,(compile-toplevel id))
                        (rhs ,(compile-at-expression-position rhs))
                        (undef-ok? ,(make-lit undef-ok?))))]))


;; compile-boxenv: boxenv -> jsexp
(define (compile-boxenv a-boxenv)
  (match a-boxenv
    [(struct boxenv (pos body))
     (make-ht 'boxenv `((pos ,(make-int pos))
                        (body ,(compile-at-expression-position body))))]))


;; compile-topsyntax: topsyntax -> jsexp
(define (compile-topsyntax a-topsyntax)
  (match a-topsyntax
    [(struct topsyntax (depth pos midpt))
     (make-ht `topsyntax `((depth ,(make-int depth))
                           (pos ,(make-int pos))
                           (midpt ,(make-int midpt))))]))





;; test: path -> state
;; exercising function
#;(define (test path)
  (let ([parsed (translate-compilation-top (internal:zo-parse (open-input-file path)))])
    (compile-top parsed)))



#;(test "../tests/42/compiled/42_ss_merged_ss.zo")
#;(test "../tests/square/compiled/square_ss_merged_ss.zo")