exports.is_email = (ctx, str) => {
  if (typeof str !== 'string' && !(str instanceof String)) {
    throw TypeError(`${ctx} must be a string`)
  }

  exports.is_length(ctx, str, 5, 100)

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
    throw TypeError(`${ctx} is not an email address`)
  }
}

exports.is_length = (ctx, str, ...args) => {
  let min, max

  if (args.length === 1) {
    min = 0
    max = args[0]
  } else {
    min = args[0]
    max = args[1]
  }

  if (typeof str !== 'string' && !(str instanceof String)) {
    throw TypeError(`${ctx} must be a string`)
  }

  if (str.length < min) {
    throw TypeError(`${ctx} must be at least ${min} chars long`)
  }

  if (str.length > max) {
    throw TypeError(`${ctx} must contain ${max} chars at most`)
  }
}
