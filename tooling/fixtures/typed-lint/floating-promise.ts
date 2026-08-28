export async function leavePromiseUnhandled() {
  Promise.resolve('unhandled');
}
