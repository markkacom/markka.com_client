/* Part of MOFO Wallet project. */
function Iterator(array) {
  this.cursor = 0;
  this.length = array.length;
  this.array  = array;
}
Iterator.prototype = {
  hasMore: function () {
    return this.cursor < this.length;
  },
  next: function () {
    return this.array[this.cursor++];
  }
};