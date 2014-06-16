#lang racket

(require "compiler/desugar.ss")
(require "collects/moby/runtime/stx.ss")
(require "compile-helpers.ss")
(require "compiler/pinfo.ss")

(define code "'(1 a \"a\" (2 b \"b\" (3) f))")


(map stx->datum (parse-string-as-program code))

(map stx->datum
      (first
       (desugar-program (parse-string-as-program code) empty-pinfo)))
