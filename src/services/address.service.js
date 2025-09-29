import Address from '../models/Address.js';

export async function getUserAddressesService(userId) {
  return Address.find({ user: userId, isActive: true })
    .sort({ isDefault: -1, createdAt: -1 })
    .select('-__v');
}

export async function getAddressByIdService(addressId, userId) {
  return Address.findOne({ _id: addressId, user: userId, isActive: true });
}

export async function getDefaultAddressService(userId) {
  return Address.findOne({ user: userId, isDefault: true, isActive: true });
}

export async function createAddressService(userId, addressData) {
  const { isDefault, ...restData } = addressData;
  
  // If setting as default, unset all other defaults
  if (isDefault) {
    await Address.updateMany(
      { user: userId },
      { $set: { isDefault: false } }
    );
  }

  // Set this as default if it's the first address
  const addressCount = await Address.countDocuments({ user: userId });
  const shouldBeDefault = isDefault || addressCount === 0;

  const address = new Address({
    user: userId,
    ...restData,
    isDefault: shouldBeDefault
  });

  return address.save();
}

export async function updateAddressService(addressId, userId, addressData) {
  const { isDefault, ...restData } = addressData;
  
  // If setting as default, unset all other defaults
  if (isDefault) {
    await Address.updateMany(
      { user: userId, _id: { $ne: addressId } },
      { $set: { isDefault: false } }
    );
  }

  return Address.findOneAndUpdate(
    { _id: addressId, user: userId, isActive: true },
    { ...restData, isDefault: isDefault || false },
    { new: true, runValidators: true }
  );
}

export async function deleteAddressService(addressId, userId) {
  const address = await Address.findOne({ _id: addressId, user: userId, isActive: true });
  
  if (!address) {
    return null;
  }

  // If deleting default address, make another one default
  if (address.isDefault) {
    const nextAddress = await Address.findOne({ user: userId, _id: { $ne: addressId }, isActive: true })
      .sort({ createdAt: 1 });
    
    if (nextAddress) {
      nextAddress.isDefault = true;
      await nextAddress.save();
    }
  }

  // Soft delete
  address.isActive = false;
  return address.save();
}

export async function setDefaultAddressService(addressId, userId) {
  // Unset all defaults
  await Address.updateMany(
    { user: userId },
    { $set: { isDefault: false } }
  );

  // Set new default
  const address = await Address.findOneAndUpdate(
    { _id: addressId, user: userId, isActive: true },
    { $set: { isDefault: true } },
    { new: true }
  );

  return address;
}
