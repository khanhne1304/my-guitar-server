// Centralized company info used to answer non-product FAQs (contact, address, hours, policies)
export const companyInfo = {
	name: 'CÔNG TY CỔ PHẦN ABC',
	phones: {
		sales: '1800 9876', // miễn phí
		complaint: '0972066123',
	},
	hours: '8h–22h',
	email: '22110348@student.hcmute.edu.vn',
	address: 'Số 1, Võ Văn Ngân, Phường Linh Chiểu, TP Thủ Đức, TP HCM',
	website: 'myapp.vn',
	routes: {
		about: '/about',
		showrooms: '/showrooms',
		contact: '/contact',
		installment: '/installment',
		loyalty: '/loyalty',
		terms: '/terms',
		shippingReturns: '/shipping-returns',
		howToBuy: '/how-to-buy',
		paymentSecurity: '/payment-security',
		warrantyPolicy: '/warranty-policy',
		warrantyLookup: '/warranty',
	},
	payments: ['VISA', 'MasterCard', 'COD', 'napas', '123Pay'],
	certifications: ['Bộ Công Thương', 'DMCA', 'PROTECTED'],
	socials: {
		facebook: 'https://facebook.com',
		youtube: 'https://youtube.com',
		instagram: 'https://instagram.com',
		zalo: 'https://zalo.me',
	},
};

export function isCompanyQuery(text) {
	const t = String(text || '').toLowerCase();
	const keys = [
		'công ty', 'cong ty', 'giới thiệu', 'gioi thieu', 'liên hệ', 'lien he', 'liên lạc', 'lien lac',
		'địa chỉ', 'dia chi', 'ở đâu', 'o dau', 'địa điểm', 'dia diem', 'hotline', 'số điện thoại', 'so dien thoai',
		'email', 'giờ làm', 'gio lam', 'thời gian phục vụ', 'theo gio', 'showroom', 'đại lý', 'dai ly',
		'chính sách', 'chinh sach', 'đổi trả', 'doi tra', 'bảo hành', 'bao hanh', 'trả góp', 'tra gop',
		'thanh toán', 'thanh toan', 'chứng nhận', 'chung nhan', 'dmca', 'bộ công thương', 'bo cong thuong',
		'website', 'myapp.vn',
	];
	return keys.some((k) => t.includes(k));
}

export function answerCompanyQuestion(message) {
	const t = String(message || '').toLowerCase();
	const { phones, email, hours, address, website, routes, payments, certifications, name } = companyInfo;

	const wantsAddress = /(địa chỉ|dia chi|ở đâu|o dau|địa điểm|dia diem)/.test(t);
	if (wantsAddress) {
		return `Địa chỉ công ty: ${address}. Giờ phục vụ: ${hours}. Hotline: ${phones.sales}.`;
	}

	const wantsPhone = /(hotline|số điện thoại|so dien thoai|gọi mua hàng|goi mua hang|khiếu nại|khieu nai)/.test(t);
	if (wantsPhone) {
		return `Hotline mua hàng: ${phones.sales} (miễn phí). Khiếu nại/Bảo hành: ${phones.complaint}. Thời gian phục vụ: ${hours}.`;
	}

	const wantsEmail = /email|mail/.test(t);
	if (wantsEmail) {
		return `Email liên hệ: ${email}. Bạn cũng có thể sử dụng trang Liên hệ: ${routes.contact}.`;
	}

	const wantsHours = /(giờ làm|gio lam|thời gian phục vụ)/.test(t);
	if (wantsHours) {
		return `Thời gian phục vụ: ${hours}. Hotline hỗ trợ: ${phones.sales}.`;
	}

	const wantsShowroom = /(showroom|đại lý|dai ly|hệ thống showroom)/.test(t);
	if (wantsShowroom) {
		return `Hệ thống showroom/đại lý: ${routes.showrooms}. Bạn có thể xem địa điểm chi tiết tại trang này.`;
	}

	const wantsInstallment = /(trả góp|tra gop)/.test(t);
	if (wantsInstallment) {
		return `Thông tin mua trả góp: ${routes.installment}.`;
	}

	const wantsReturns = /(đổi trả|doi tra|giao hàng)/.test(t);
	if (wantsReturns) {
		return `Chính sách Giao hàng - Đổi trả: ${routes.shippingReturns}.`;
	}

	const wantsWarranty = /(bảo hành|bao hanh|tra cứu|tra cuu|kích hoạt|kich hoat)/.test(t);
	if (wantsWarranty) {
		return `Chính sách bảo hành: ${routes.warrantyPolicy}. Tra cứu/Kích hoạt bảo hành: ${routes.warrantyLookup}.`;
	}

	const wantsPayment = /(thanh toán|thanh toan|payment|visa|mastercard|cod|napas)/.test(t);
	if (wantsPayment) {
		return `Hỗ trợ thanh toán: ${payments.join(', ')}. Xem thêm: ${routes.paymentSecurity}.`;
	}

	const wantsCert = /(chứng nhận|chung nhan|dmca|bộ công thương|bo cong thuong)/.test(t);
	if (wantsCert) {
		return `Chứng nhận: ${certifications.join(', ')}.`;
	}

	const wantsWebsite = /(website|web|myapp\.vn)/.test(t);
	if (wantsWebsite) {
		return `Website: ${website}. Trang Giới thiệu: ${routes.about}. Trang Liên hệ: ${routes.contact}.`;
	}

	// General company info
	return `${name}. Hotline: ${phones.sales}. Bảo hành/Khiếu nại: ${phones.complaint}. Email: ${email}. Địa chỉ: ${address}. Giờ phục vụ: ${hours}. Website: ${website}.`;
}


