// utils/apiFeatures.js
export default class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.qs = queryString;
  }

  // ========== 1. Filter cơ bản ==========
  filter() {
    const queryObj = { ...this.qs };

    // Loại bỏ các field không dùng cho filter
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'q'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Chuyển đổi gte, lte, in... thành cú pháp MongoDB
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt|ne|in|nin)\b/g,
      (match) => `$${match}`
    );

    this.query = this.query.find(JSON.parse(queryStr || '{}'));
    return this;
  }

  // ========== 2. Search theo từ khóa ==========
  search() {
    if (this.qs.q) {
      const regex = new RegExp(this.qs.q.trim(), 'i'); // Không phân biệt hoa thường
      this.query = this.query.find({
        $or: [
          { name: regex },
          { description: regex },
          { slug: regex }, // 👈 thêm nếu bạn muốn tìm theo slug
        ],
      });
    }
    return this;
  }

  // ========== 3. Sắp xếp ==========
  sort() {
    if (this.qs.sort) {
      const sortBy = this.qs.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt'); // mặc định: mới nhất trước
    }
    return this;
  }

  // ========== 4. Giới hạn field trả về ==========
  limitFields() {
    if (this.qs.fields) {
      const fields = this.qs.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v'); // bỏ __v mặc định
    }
    return this;
  }

  // ========== 5. Phân trang ==========
  paginate() {
    const page = Number(this.qs.page) || 1;
    const limit = Math.min(Number(this.qs.limit) || 12, 100); // tối đa 100/sp
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}
