#lang racket

(require racket/sandbox
         racket/runtime-path
         setup/dirs
         racket/cmdline
         (for-syntax racket/base)
         "compiler-service.rkt")


(define current-port (make-parameter 8080))
(define current-memory-limit (make-parameter 256))
(define current-extra-module-providers (make-parameter '()))

(void (command-line
       #:once-each 
       [("-p" "--port") p "Port (default 8080)" 
                        (current-port (string->number p))]
       [("--memory-limit") memlimit "Memory limit in MB (default 256)"
                           (current-memory-limit (string->number memlimit))]
       [("--extra-module-provider") 
        mp
        "The path of a module, relative to current-directory, that provides an additional 'module-provider"
        (current-extra-module-providers 
         (cons mp (current-extra-module-providers)))]))


(write-runtime-files)

(define-runtime-path server-path (build-path "compiler-service.rkt"))

(define (my-network-guard name str port role)
  (printf "I see: ~s ~s ~s ~s\n" name str port role)
  #t)



(let sandbox-loop ()
  (with-handlers ([exn:fail:resource?
                   (lambda (exn)
                     (printf "server died from resource limits?  ~s\n" 
                             (exn-message exn)))]
                  [exn:fail:sandbox-terminated?
                   (lambda (exn)
                     (printf "server died prematurely due to sandbox?  ~s\n" 
                             (exn-message exn)))]
                  [exn:fail?
                   ;; We should never hit this case, but never say never
                   (lambda (exn)
                     (printf "server died prematurely?  ~s\n" 
                             (exn-message exn)))])
    (let loop ()
      (parameterize ([sandbox-memory-limit (current-memory-limit)]
                     [sandbox-eval-limits '(+inf.0 256)]
                     [sandbox-output (current-output-port)]
                     [sandbox-network-guard my-network-guard]
                     [sandbox-path-permissions (list (list 'read (build-path "/"))
                                                     (list 'exists (build-path "/"))
                                                     (list 'read-bytecode (build-path "/")))])
        (printf "memory limit: ~s mb\n" (sandbox-memory-limit))
        (define eval
          (make-module-evaluator server-path
                                 #:allow-read (list (build-path "/"))))
        (printf "starting server thread\n")
        (eval 
         `(begin (define server-thread (thread (lambda ()
                                                 (start-server #:port ,(current-port)
                                                               #:extra-module-providers ',(current-extra-module-providers)))))
                 (printf "thread started\n")
                 (with-handlers ([exn:fail?
                                  (lambda (exn)
                                    (printf "server died prematurely?  ~s\n" 
                                            (exn-message exn)))])
                   (sync server-thread))))
        (printf "restarting server\n")
        (loop))))
  (sandbox-loop))
