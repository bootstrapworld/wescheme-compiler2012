#lang scheme

(require compiler/zo-parse)




(define (mapset f lst)
  (unique (apply append (map f lst))))

(define (union . rest)
  (unique (apply append rest)))

(define (unique lst)
  (define ht (make-hash))
  (for ([x lst])
    (hash-set! ht x #t))
  (for/list ([x (in-hash-keys ht)])
    x))

(define visited-indirects (make-hasheq))
(define (seen? x)
  (hash-ref visited-indirects x #f))
(define (mark-seen! x)
  (hash-set! visited-indirects x #t))

(define (collect a-top)
  (match a-top
    [(struct compilation-top (max-let-depth prefix code))
     (collect code)]
    [(struct def-values (ids rhs))
     (union (mapset collect ids)
            (collect rhs))]
    [(struct def-syntaxes (ids rhs prefix max-let-depth))
     (union (mapset collect ids)
            (collect rhs))]
    [(struct def-for-syntax (ids rhs prefix max-let-depth))
     (union (mapset collect ids)
            (collect rhs))]
    [(struct req (reqs dummy))
     (collect dummy)]
    [(struct seq (forms))
     (mapset collect forms)]
    [(struct splice (forms))
     (mapset collect forms)]
    [(struct mod (name self-od-indx prefix provides requires body syntax-body unexported max-let-depth dummy lang-info internal-context))
     (mapset collect body)]
    [(struct lam (name flags num-params param-types rest? closure-map closure-types max-let-depth body))
     (union '(lam)
            (collect body))]
    [(struct closure (code gen-id))
     (union '(closure)
            (collect code))]
    [(struct indirect (v))
     (if (seen? a-top)
         '()
         (begin
           (mark-seen! a-top)
           (union '(indirect)
                  (collect v))))]
    [(struct case-lam (name clauses))
     (union '(case-lam)
             (mapset collect clauses))]
    [(struct let-one (rhs body flonum?))
     (union '(let-one)
            (collect body))]
    [(struct let-void (count boxes? body))
     (union '(let-void)
            (collect body))]
    [(struct install-value (count pos bodies? rhs body))
     (union '(install-value)
            (collect rhs)
            (collect body))]
    [(struct let-rec (procs body))
     (union '(let-rec)
            (mapset collect procs)
            (collect body))]
    [(struct boxenv (pos body))
     (union '(boxenv)
            (collect body))]
    [(struct localref (unbox? pos clear? other-clears? flonum?))
     `(localref)]
    [(struct toplevel (depth pos const? ready?))
     `(toplevel)]
    [(struct topsyntax (depth pos midpt))
     `(topsyntax)]
    [(struct application (rator rands))
     (union `(application)
            (collect rator)
            (mapset collect rands))]
    [(struct branch (test then else))
     (union `(branch)
            (collect test)
            (collect then)
            (collect else))]
    [(struct with-cont-mark (key val body))
     (union '(with-cont-mark)
            (collect key)
            (collect val)
            (collect body))]
    [(struct beg0 (seq))
     (union '(beg0)
            (mapset collect seq))]
    [(struct varref (toplevel))
     (union '(varref)
            (collect toplevel))]
    [(struct assign (id rhs undef-ok?))
     (union '(assign)
            (collect rhs))]
    [(struct apply-values (proc args-expr))
     (union '(apply-values)
            (collect proc)
            (collect args-expr))]
    [(struct primval (id))
     '(primval)]
    [else
     '()]
    ))     


(define a-top (zo-parse (open-input-file "../sandbox/flight-lander/flight-lander_ss_merged_ss.zo")))
