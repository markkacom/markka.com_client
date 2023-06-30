/* Part of MOFO Wallet project. */
function Iterator(array, filterPredicate) {
  this.cursor = 0;
  this.length = array.length;
  this.array  = array;
  this.filterPredicate  = filterPredicate;
}
Iterator.prototype = {
  hasMore: function () {
    return this.cursor < this.length;
  },
  next: function () {
    var v = this.array[this.cursor++];
    if (this.filterPredicate) {
      if (!this.filterPredicate(v)) return null;
    }
    return v;
  },
  peek: function () {
    return this.array[this.cursor];
  }
};
