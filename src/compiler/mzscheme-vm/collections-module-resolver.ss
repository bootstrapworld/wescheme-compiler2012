#lang scheme/base

;; Collections module resolver: resolve the built-in collections
(require scheme/contract
         scheme/match
         scheme/list
         "../pinfo.ss"
         "../analyzer.ss"
         "../desugar.ss"
         "../../module-provider.rkt"
         "../../stx-helpers.ss"
         "../../collects/moby/runtime/binding.ss"
         "collections/manifest.ss")


;; extend-module-resolver-with-collections: module-resolver -> module-resolver
;; Creates an extended resolver.
(define (extend-module-resolver-with-collections a-resolver)
  (let ([module-bindings
         (map read-bindings-from-collection-reference known-collections)])  
    (lambda (module-name)
      (let loop ([module-bindings module-bindings])
        (cond [(empty? module-bindings)
               (a-resolver module-name)]
              [(equal? module-name (module-binding-name (first module-bindings)))
               (first module-bindings)]
              [else
               (loop (rest module-bindings))])))))


;; read-bindings-from-collection-reference: collection-reference -> module-binding
(define (read-bindings-from-collection-reference a-collection-reference)
  (match a-collection-reference
    [(struct collection-reference (name path))
     (call-with-input-file path
       (lambda (in)
         (let* ([a-program (read-syntaxes in #:name name)]
                [a-pinfo
                 (pinfo-update-allow-redefinition? (get-base-pinfo 'moby)
                                                   #f)]
                [a-program+pinfo (desugar-program a-program a-pinfo)]
                [a-program (first a-program+pinfo)]
                [a-pinfo (second a-program+pinfo)]
                [a-pinfo (program-analyze/pinfo a-program a-pinfo)])
           (make-module-binding name 
                                name
                                (map (lambda (binding) (localize-binding binding name))
                                     (pinfo-get-exposed-bindings a-pinfo))))))]))
         

;; localize-binding: module-binding source -> module-binding
(define (localize-binding a-binding a-source)
  (match a-binding
    [(struct binding:constant (name
                               module-source 
                               permissions
                               loc))
     (make-binding:constant name a-source permissions loc)]
 
    [(struct binding:function (name
                               module-source
                               min-arity 
                               var-arity? 
                               permissions 
                               cps?
                               loc))
     (make-binding:function name a-source min-arity var-arity? permissions cps? loc)]
             
    
    [(struct binding:structure (name 
                                module-source
                                fields 
                                constructor
                                predicate 
                                accessors
                                mutators
                                permissions
                                loc))
     (make-binding:structure name a-source fields constructor predicate accessors mutators permissions loc)]))
    

;; extend-module-resolver-with-module-provider:
;;     module-resolver (module-name -> module-provider-record) -> module-resolver
;;
;; Use a module provider to also do module lookup and resolution.
(define (extend-module-resolver-with-module-provider original-resolver a-provider)
  (define (wrapped-resolver module-name)
    (define a-record (a-provider module-name))
    (cond
      [a-record
       (define binding (make-module-binding module-name
                                            module-name
                                            (for/list ([provided-name (module-provider-record-provides a-record)])
                                              (make-binding:constant (string->symbol provided-name)
                                                                     module-name '() #f))))
       binding]
      [else
       (original-resolver module-name)]))
  wrapped-resolver)

         
 ;; read-syntaxes: input-port #:name symbol -> (listof stx)
(define (read-syntaxes in #:name name)
  (port-count-lines! in)
  (map syntax->stx
       (let loop ()
         (let ([stx (read-syntax name in)])
           (cond
             [(eof-object? stx)
              '()]
             [else
              (cons stx (loop))]))))) 

(define module-resolver/c
  (module-name? . -> . (or/c module-binding? false/c)))


(provide/contract [extend-module-resolver-with-collections
                   (module-resolver/c . -> . module-resolver/c)]
                  [extend-module-resolver-with-module-provider
                   (module-resolver/c (module-name? . -> . (or/c false/c module-provider-record?))
                                      . -> . module-resolver/c)])
