export default class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.qs = queryString;
  }
  filter() {
    const q = { ...this.qs };
    ['page', 'sort', 'limit', 'fields', 'keyword'].forEach((k) => delete q[k]);
    let str = JSON.stringify(q);
    str = str.replace(/\b(gte|gt|lte|lt|ne|in|nin)\b/g, (m) => `$${m}`);
    this.query = this.query.find(JSON.parse(str || '{}'));
    return this;
  }
  search() {
    if (this.qs.keyword) {
      const regex = new RegExp(this.qs.keyword, 'i');
      this.query = this.query.find({
        $or: [{ name: regex }, { description: regex }],
      });
    }
    return this;
  }
  sort() {
    if (this.qs.sort) {
      this.query = this.query.sort(this.qs.sort.split(',').join(' '));
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }
  limitFields() {
    if (this.qs.fields) {
      this.query = this.query.select(this.qs.fields.split(',').join(' '));
    }
    return this;
  }
  paginate() {
    const page = Number(this.qs.page) || 1;
    const limit = Math.min(Number(this.qs.limit) || 12, 100);
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}
