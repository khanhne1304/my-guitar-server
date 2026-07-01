import Banner from '../models/Banner.js';

export async function listPublic(req, res, next) {
  try {
    const banners = await Banner.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    res.json({
      banners: banners.map((b) => ({
        id: b._id.toString(),
        imageUrl: b.imageUrl,
        alt: b.alt || '',
        linkUrl: b.linkUrl || '',
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function listAdmin(req, res, next) {
  try {
    const banners = await Banner.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    res.json({ banners });
  } catch (e) {
    next(e);
  }
}

export async function create(req, res, next) {
  try {
    const { imageUrl, alt, linkUrl, sortOrder, isActive } = req.body;
    if (!imageUrl?.trim()) {
      return res.status(400).json({ message: 'URL ảnh banner là bắt buộc' });
    }
    const banner = await Banner.create({
      imageUrl: imageUrl.trim(),
      alt: (alt || '').trim(),
      linkUrl: (linkUrl || '').trim(),
      sortOrder: Number(sortOrder) || 0,
      isActive: isActive !== false,
    });
    res.status(201).json(banner);
  } catch (e) {
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const { imageUrl, alt, linkUrl, sortOrder, isActive } = req.body;
    const patch = {};
    if (imageUrl !== undefined) {
      if (!String(imageUrl).trim()) {
        return res.status(400).json({ message: 'URL ảnh banner không được để trống' });
      }
      patch.imageUrl = String(imageUrl).trim();
    }
    if (alt !== undefined) patch.alt = String(alt).trim();
    if (linkUrl !== undefined) patch.linkUrl = String(linkUrl).trim();
    if (sortOrder !== undefined) patch.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) patch.isActive = !!isActive;

    const banner = await Banner.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    });
    if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner' });
    res.json(banner);
  } catch (e) {
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner' });
    res.json({ message: 'Đã xoá banner' });
  } catch (e) {
    next(e);
  }
}
