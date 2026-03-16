def fibonacci(n)
  raise ArgumentError, "n must be a non-negative integer" if n < 0
  return n if (0..1).include? n
  fibonacci(n - 1) + fibonacci(n - 2) # recursive calls
end
