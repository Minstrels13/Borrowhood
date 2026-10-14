export function serviceError(error, resource) {
  return ['PGRST202', 'PGRST205'].includes(error.code)
    ? new Error(`${resource} are temporarily unavailable. Please try again later.`)
    : error;
}
