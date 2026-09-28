export interface RawMaterial {
  id: string;
  name: string;
  category: string; // e.g., Flour, Oil, Spices, Packaging, etc.
  unit: 'g' | 'kg' | 'L' | 'pcs' | 'packs' | 'bundle'; // grams, kilograms, liters, pieces, packs or bundle
  currentStockGrams: number; // for pieces/packs/bundle, represents count
  minStockGrams: number; // for pieces/packs/bundle, represents min count
  averageCostPerGram: number; // Moving average cost per gram or per piece/pack/bundle
  lastUpdated: string;
  image?: string; // Image URL or Base64 photo attachment
}

export interface PackagingSize {
  id: string;
  grams: number; // e.g., 50g, 100g
  unit?: 'gram' | 'kg' | 'liter' | 'pieces' | 'packs' | 'bundle';
  packsPerBundle?: number; // e.g., 10 packs = 1 Bundle (e.g. 100g * 10 pack)
  pouchCost: number; // Individual plastic bag/packaging pouch cost
  mrp: number; // Retail / Shop Selling price
  wholesalePrice?: number; // Wholesaler discounted price
  quantityToPack?: number; // Quantity to be packed
}

export interface RecipeIngredient {
  materialId: string;
  weightGrams: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  baseBatchSizeGrams: number; // e.g., 10000 for 10kg
  producedYieldKg?: number; // Cooked/Finished product yield produced (in kg)
  sellingPricePerKg?: number; // Bulk / wholesale selling price per kg (₹)
  laborDailyWage: number;
  laborWorkersCount: number;
  overheadCost: number; // Fixed overheads like rent, electricity per batch
  ingredients: RecipeIngredient[];
  packagingSizes: PackagingSize[];
  image?: string; // Recipe / Dish Photo URL or Base64
  // Additional production costing fields
  oilUsedLitres?: number;
  oilCostPerLitre?: number;
  fuelType?: 'Gas' | 'Firewood' | 'Other';
  fuelCost?: number;
  otherBurdenCost?: number;
}

export type BatchStatus = 
  | 'Planned' 
  | 'Raw Materials Issued' 
  | 'In Production' 
  | 'Cooking Completed' 
  | 'Cooling' 
  | 'Quality Check' 
  | 'Ready for Packaging' 
  | 'Packaging in Progress' 
  | 'Packaging Completed' 
  | 'Batch Completed' 
  | 'Hold' 
  | 'Rejected' 
  | 'Cancelled' 
  | 'In Bulk' 
  | 'Packed';

export interface ProductionBatch {
  id: string;
  recipeId: string;
  batchNumber: string;
  date: string;
  status: BatchStatus;
  batchSizeGrams: number; // How much was mixed/produced (usually matches or scale of baseBatchSize)
  actualYieldPackets: { [packSizeId: string]: number }; // Quantity of each pack size produced
  expectedYieldPackets: { [packSizeId: string]: number }; // Theoretical quantity based on weight
  laborCostActual: number;
  overheadCostActual: number;
  
  // Traceability & Production Line
  recipeVersion?: string;
  productionShift?: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  productionLine?: string; // e.g. "Fryer 1", "Kadai A", "Line 2"
  operatorName?: string;
  supervisorName?: string;

  // Timestamps
  startTime?: string;
  cookingStartTime?: string;
  cookingEndTime?: string;
  coolingStartTime?: string;
  coolingEndTime?: string;
  packagingStartTime?: string;
  packagingEndTime?: string;
  completedAt?: string;

  // Target Parameters
  plannedRawMaterialKg?: number;
  expectedCookedKg?: number;
  expectedFinishedKg?: number;
  expectedYieldPercent?: number; // e.g. 90%
  expectedProductionLossPercent?: number; // e.g. 8%
  expectedPackagingLossPercent?: number; // e.g. 2%
  expectedPacksCount?: number;
  targetPackSizeGrams?: number;

  // Cooking / Frying Parameters
  cookingMethod?: 'Frying' | 'Roasting' | 'Baking' | 'Boiling' | 'Extrusion' | 'Mixing';
  fryerKadaiId?: string;
  oilType?: string;
  oilBatchLot?: string;
  targetTemperature?: number; // °C
  actualMinTemp?: number; // °C
  actualMaxTemp?: number; // °C
  actualAvgTemp?: number; // °C
  tempStatus?: 'Within Standard' | 'Out of Standard';
  tempOutReason?: string;
  tempCorrectiveAction?: string;
  tempApprovedBy?: string;
  targetCookingTimeMinutes?: number;
  actualCookingTimeMinutes?: number;
  productLoadingKg?: number;

  // Additional precision oil accounting fields
  oilUsedLitresActual?: number;
  oilCostPerLitreActual?: number;
  oilOpeningLitres?: number;
  oilOpeningRate?: number;
  oilFreshAddedLitres?: number;
  oilFreshAddedRate?: number;
  oilRecoveredLitres?: number; // Reusable oil recovered
  oilWasteLitres?: number; // Burnt, contaminated, or spilled oil
  oilCarriedForwardLitres?: number; // Reusable oil remaining in fryer/tank for next batch
  oilFryerName?: string; // e.g. "Fryer 1", "Kadai 1", "Line A"
  oilOperator?: string;
  oilWasteReason?: 'Burnt Oil' | 'Contaminated Oil' | 'Spillage' | 'Disposal' | 'Other';
  fuelTypeActual?: 'Gas' | 'Firewood' | 'Other';
  fuelCostActual?: number;
  otherBurdenCostActual?: number;

  // Cooling Process
  coolingDurationMinutes?: number;
  coolingArea?: string;
  coolingRackTray?: string;
  productTempAtStart?: number;
  productTempAtEnd?: number;
  targetPackagingTempMax?: number; // e.g. 35°C
  actualPackagingTemp?: number;
  coolingStatus?: 'Ready for Packaging' | 'Cooling Required' | 'Overridden';
  tempOverrideUser?: string;
  tempOverrideReason?: string;
  tempOverrideTimestamp?: string;

  // Cooked Product Weighing
  actualCookedWeightKg?: number;
  weighingContainersCount?: number;
  weighingScaleId?: string;
  weighingTimestamp?: string;
  weighingOperator?: string;

  // Post-Cook Adjustments & Losses
  coolingLossKg?: number;
  moistureLossKg?: number;
  sortingLossKg?: number;
  rejectionLossKg?: number;
  qualityRejectionKg?: number;
  brokenLossKg?: number;
  burntLossKg?: number;
  spillageLossKg?: number;
  handlingLossKg?: number;
  otherLossKg?: number;
  reworkQuantityKg?: number;
  acceptedWeightKg?: number; // Cooked Weight - Total Post-Cook Loss
  totalPostCookLossKg?: number;

  // Quality Control Check
  qcInspector?: string;
  qcDate?: string;
  qcAppearance?: 'Pass' | 'Fail' | 'Good' | 'Fair';
  qcColour?: 'Pass' | 'Fail' | 'Good' | 'Fair';
  qcTexture?: 'Pass' | 'Fail' | 'Good' | 'Fair';
  qcTaste?: 'Pass' | 'Fail' | 'Good' | 'Fair';
  qcAroma?: 'Pass' | 'Fail' | 'Good' | 'Fair';
  qcCrispness?: 'Pass' | 'Fail' | 'Good' | 'Fair';
  qcMoisturePercent?: number;
  qcForeignMatterCheck?: 'Passed (Nil)' | 'Failed';
  qcTempCheck?: number;
  qcWeightCheckKg?: number;
  qcStatus?: 'PASS' | 'HOLD' | 'REJECT' | 'PENDING';
  qcHoldReason?: string;
  qcHoldCorrectiveAction?: string;
  qcHoldReinspectionDate?: string;
  qcRejectionReason?: string;
  qcRejectionDecision?: 'Disposal' | 'Rework' | 'Return';
  qcApprovedBy?: string;

  // Packaging Details & Weight Validation
  packagingMachineId?: string;
  packagingOperator?: string;
  packagingSupervisor?: string;
  goodPacksCount?: number;
  rejectedPacksCount?: number;
  damagedPacksCount?: number;
  underweightPacksCount?: number;
  overweightPacksCount?: number;
  packagingMaterialUsedUnits?: number;
  packagingMaterialWasteUnits?: number;
  totalGoodPackedKg?: number;
  remainingLooseKg?: number;
  packagingLossKg?: number;
  packWeightTargetGrams?: number;
  packWeightMinGrams?: number;
  packWeightMaxGrams?: number;
  avgPackWeightGrams?: number;
  reconciliationNotes?: string;

  // Finished Goods Stock Integration
  postedToFinishedGoods?: boolean;
  finishedGoodsPostedAt?: string;
  finishedGoodsQtyKg?: number;
  finishedGoodsPacksCount?: number;

  // Calculated Yields, Costs & Alerts
  cookingYieldPercent?: number;
  postCoolingYieldPercent?: number;
  packagingYieldPercent?: number;
  totalProductionLossKg?: number;
  totalProductionLossPercent?: number;
  rawMaterialCostTotal?: number;
  actualOilCostTotal?: number;
  packagingMaterialCostTotal?: number;
  directLaborCostTotal?: number;
  energyCostTotal?: number;
  otherCostTotal?: number;
  allocatedOverheadTotal?: number;
  totalBatchCostCalculated?: number;
  costPerKgCalculated?: number;
  costPerPackCalculated?: number;
  highLossAlert?: boolean;
  highLossReason?: string;
  highLossCorrectiveAction?: string;
  highLossSupervisorApproval?: string;

  notes?: string;
  photoAttachment?: string; // Base64 encoded string of photo or batch image
  // Packaging Details & Selling Value
  packedQuantityGrams?: number; // How much packed (amount in grams/units)
  packedQuantityDisplay?: string; // Display string e.g. "40 kg" or "400 bags"
  unpackedQuantityGrams?: number; // How much not yet packed left (amount in grams/units)
  unpackedQuantityDisplay?: string; // Display string e.g. "10 kg left in bulk"
  sellingValueTotal?: number; // Total selling value entered (₹)
  sellingPricePerUnit?: number; // Selling rate per unit/kg (₹)
}

export interface PurchaseItem {
  materialId: string;
  quantityGrams: number;
  totalCost: number;
  costPerGram: number;
}

export interface PurchaseBill {
  id: string;
  billNumber: string;
  supplierName: string;
  vendorName?: string;
  date: string;
  items: PurchaseItem[];
  totalAmount?: number;
  notes?: string;
  photoAttachment?: string; // Base64 encoded string of photo or image URL
}

export interface PlannedBatch {
  recipeId: string;
  batchesCount: number;
}

export interface OrderPlan {
  id: string;
  name: string;
  createdAt: string;
  plannedBatches: PlannedBatch[];
  safetyBufferPercent: number; // e.g. 10 for 10%
}

export interface WasteEntry {
  id: string;
  materialId: string;
  quantityGrams: number; // for pieces/packs/bundle, represents count
  cost: number; // calculated loss value (averageCostPerGram * quantityGrams)
  reason: 'Expired' | 'Damaged' | 'Spilled' | 'Contaminated' | 'Other';
  date: string;
  notes?: string;
}

export interface SaleItem {
  recipeId: string;
  packSizeId?: string; // Optional if sold in bulk/kg vs packets
  packSizeName?: string; // e.g. "50g Pouch" or "Bulk (per kg)"
  priceType?: 'Wholesaler' | 'Shop/Retail'; // Price tier applied
  saleUnit?: 'Packs' | 'Bundles' | 'Kg'; // Units sold in
  packsPerBundle?: number; // e.g. 10 packs per bundle
  quantity: number; // number of packets, bundles, or weight in kg
  unitPrice: number; // selling price per packet, bundle, or kg
  totalAmount: number; // quantity * unitPrice
}

export interface SplitPayment {
  cash: number;
  upi: number;
  bankTransfer: number;
  credit: number;
  cheque: number;
}

export interface PaymentPaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: string;
  notes?: string;
  receivedBy: string;
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  saleId: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  paymentMethod: string;
  amountReceived: number;
  previousBalance: number;
  remainingBalance: number;
  receivedBy: string;
  notes?: string;
}

export interface SaleEntry {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerType?: 'Wholesaler' | 'Shop/Retail'; // Customer type / tier
  date: string;
  time?: string;
  salesPerson?: string;
  items: SaleItem[];
  totalAmount: number;
  discount: number; // discount in ₹
  taxAmount: number; // tax in ₹
  finalAmount: number; // totalAmount - discount + taxAmount
  paymentStatus: 'Paid' | 'Pending' | 'Partial' | 'Cancelled';
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Credit' | 'Split Payment';
  splitPayment?: SplitPayment;
  paidAmount?: number;
  balanceAmount?: number;
  paymentHistory?: PaymentPaymentRecord[];
  isCancelled?: boolean;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  notes?: string;
  photoAttachment?: string; // Base64 encoded string of photo or invoice upload
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    mapsUrl?: string;
    capturedAt?: string;
    accuracyMeters?: number;
  };
  deliveryLocationText?: string;
}

// Sales Visits & Dynamic Shop Location Management
export type VisitBillingStatus = 'billed' | 'unsold' | 'approaching';

export type UnsoldReason = 
  | 'Stock Already Full'
  | 'Owner / Decision Maker Not Available'
  | 'Price / Margin Disagreement'
  | 'Existing Credit Pending'
  | 'Competitor Brand Preferred'
  | 'Shop Closed'
  | 'Sample Given - Trial'
  | 'Other';

export interface SalesVisitRecord {
  id: string;
  shopName: string;
  ownerName?: string;
  phone?: string;
  address?: string;
  date: string;
  time: string;
  salesperson: string;
  status: VisitBillingStatus;
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    address?: string;
  };
  invoiceId?: string;
  invoiceNumber?: string;
  saleAmount?: number;
  unsoldReason?: UnsoldReason;
  unsoldNotes?: string;
  followUpDate?: string;
  isNewShopProspect?: boolean;
  shopCategory?: 'Wholesaler' | 'Retail Shop' | 'Supermarket' | 'Bakery/Tea Stall' | 'Canteen';
  photoUrl?: string;
}

// Factory Expense & Overhead Spending Module
export type ExpenseCategory = string;

export interface ExpenseEntry {
  id: string;
  voucherNumber: string; // e.g. EXP-2026-001
  date: string;
  employeeName: string; // who spent or claimed it
  designation?: string;
  category: string;
  title: string; // e.g. TNEB Factory 3-Phase Bill
  amount: number; // ₹
  paymentStatus: string;
  paymentMethod?: string;
  receiptUrl?: string; // Base64 image or attachment
  notes?: string;
  approvedBy?: string;
}

// User Roles & Authentication
export type UserRole = 'CEO' | 'Admin' | 'Manager' | 'Salesperson' | 'Visitor';

export interface ModulePermissions {
  view: boolean;
  add: boolean;
  edit: boolean;
  print: boolean;
  export: boolean;
}

export interface RolePermissionsMap {
  [moduleName: string]: ModulePermissions;
}

export interface RolePermissions {
  canAccessInventory: boolean;
  canAccessRecipes: boolean;
  canAccessProduction: boolean;
  canAccessSales: boolean;
  canAccessAttendance: boolean;
  canAccessSalary: boolean;
  canAccessCostReport: boolean;
  canAccessAuditLogs: boolean;
  canAccessExpenses?: boolean;
  canAccessForecasting?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageRoles: boolean;
  [key: string]: any;
}

export interface AllRolesPermissions {
  Admin: RolePermissionsMap;
  Manager: RolePermissionsMap;
  Salesperson?: RolePermissionsMap;
  Visitor: RolePermissionsMap;
  [key: string]: any;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  title?: string; // e.g. "Founder & Managing Director"
  profilePhoto?: string;
  photoUrl?: string;
  signatureUrl?: string; // Digital signature for invoices/vouchers
  lastLogin?: string;
  loginLocation?: string;
  loginAddress?: string;
  password?: string;
  pin?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  username?: string;
  userName?: string;
  userRole: UserRole;
  module: string;
  action: string;
  details: string;
  previousValue?: string;
  updatedValue?: string;
  newValue?: string;
  location?: string;
  device?: string;
}

export interface AttendanceEntry {
  id: string;
  employeeName: string;
  staffName?: string;
  date: string;
  inTime: string;
  outTime: string;
  workingHours: number;
  status: 'Present' | 'Absent' | 'Half Day' | 'Leave';
  notes?: string;
}

export type AttendanceRecord = AttendanceEntry;

export interface SalaryEntry {
  id: string;
  employeeName: string;
  designation: string;
  payType: 'Daily Wage' | 'Monthly Salary';
  payoutCycle?: 'Daily Payout' | 'Weekly Payout' | 'Fortnightly Payout' | 'Monthly Payout';
  photoAttachment?: string; // Employee Photo Attachment
  payoutProofAttachment?: string; // Voucher / Payout receipt attachment
  rate: number;
  workingDays: number;
  presentDays: number;
  overtimeHours: number;
  overtimePay: number;
  advanceDeductions: number;
  otherDeductions: number;
  netSalary: number;
  monthYear: string;
  notes?: string;

  // Staff Identity & Details
  aadharNumber?: string;
  panNumber?: string;
  phone?: string;
  email?: string;

  // Address Details
  permanentAddress?: string;
  currentAddress?: string;
  cityStatePincode?: string;

  // Family & Emergency Details
  familyContactName?: string;
  familyRelationship?: string;
  familyPhone?: string;
  numberOfDependents?: number;
  familyNotes?: string;
  joiningDate?: string;

  // Payment Status & Pending Days Details
  paymentStatus?: 'Paid' | 'Pending' | 'Partially Paid';
  paymentDueDate?: string;
  paidAmount?: number;
  disbursementDate?: string;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque';
  paymentRefNo?: string;
}

export type EmployeeSalary = SalaryEntry;

export interface CompanyInvoiceSettings {
  companyName: string;
  tagline?: string;
  logoUrl?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone: string;
  email: string;
  fssaiNumber?: string;
  gstNumber?: string;
  gstin?: string;
  invoicePrefix?: string;
  startingNumber?: number;
  financialYear?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiId?: string;
  termsAndConditions?: string;
  footerNote?: string;

  // Factory & Production Defaults
  defaultShift?: string; // 'Full Day' | 'Morning' | 'Night'
  defaultOilType?: string; // 'Palm Oil' | 'Groundnut Oil' | 'Sunflower Oil'
  defaultOilCostPerLitre?: number;
  oilConsumptionBenchmarkRatio?: number; // e.g. 0.28 L / kg
  defaultFuelType?: string; // 'Firewood' | 'Commercial Gas LPG' | 'Briquettes'
  defaultFirewoodCostPerKg?: number;
  defaultGasCostPerCylinder?: number;
  defaultOverheadBurden?: number;
  autoDeductInventoryOnDailySave?: boolean;
  lowStockThresholdKg?: number;
  currencySymbol?: string;

  // Standard Pouch Presets (Grams)
  packagingPresets?: number[]; // [50, 100, 150, 200, 250, 400, 500, 1000, 5000]
  defaultPouchWastageBufferPercent?: number;

  // Standard Labor Benchmarks
  defaultMasterDailyWage?: number;
  defaultHelperDailyWage?: number;
  defaultPackagingDailyWage?: number;
  defaultSalesmanDailyWage?: number;
  defaultOvertimeHourlyRate?: number;
  standardShiftHours?: number;
}

// Daily Material, Labour, Oil, Firewood & Packaging Usage Ledger
export interface DailyMaterialItem {
  materialId: string;
  materialName: string;
  category?: string;
  quantityUsed: number; // in kg, grams, or pcs
  unit: string; // 'kg' | 'g' | 'L' | 'pcs'
  costPerUnit: number; // ₹ per unit
  totalCost: number; // ₹
}

export interface WeightLimitPack {
  packWeightGrams: number; // e.g. 50g, 100g, 200g, 250g, 500g, 1000g (1kg)
  packUnit?: string; // 'g' | 'kg'
  packetsCount: number; // number of packets packed e.g. 200 pkts
  totalWeightKg: number; // e.g. 10.0 kg
  recipeId?: string;
  recipeName?: string;
  pouchType?: string; // e.g. '50g Printed Cover'
  pouchCostPerUnit?: number; // e.g. ₹1.5
  totalPouchCost?: number; // e.g. ₹300
}

export interface CoverUsageItem {
  coverId?: string;
  coverName: string; // e.g. '50g Printed Cover', '100g Laminated Pouch', '250g Silver Foil Pouch'
  weightLimitGrams?: number; // 50, 100, 200, 250, 500, 1000
  coversUsedCount: number; // Total covers used to pack packets
  goodPacketsCount: number; // Successfully packed packets
  wastageCoversCount: number; // Damaged / machine tearing wastage covers
  costPerCover: number; // ₹
  totalCoverCost: number; // ₹ (coversUsedCount * costPerCover)
}

export interface DailyUsageEntry {
  id: string;
  date: string; // YYYY-MM-DD
  shift?: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Full Day';
  recipeIds: string[];
  recipeNames: string[];

  // 1. Used Raw Materials & Costs
  materialsUsed: DailyMaterialItem[];
  totalMaterialCost: number; // ₹

  // 2. Labour Cost (With Separate Roles: Chef, Helper, Sales Man, Packing Person)
  workersCount: number; // Total worker count
  dailyWagePerWorker: number; // ₹ average/default per worker
  chefCount?: number; // Cooking Master / Chef
  chefWage?: number; // Daily wage for Chef (₹)
  helperCount?: number; // Kitchen Helper / Assistant
  helperWage?: number; // Daily wage for Helper (₹)
  salesManCount?: number; // Sales Man / Delivery / Counter
  salesManWage?: number; // Daily wage for Sales Man (₹)
  packingPersonCount?: number; // Packing Person / Sealing Staff
  packingPersonWage?: number; // Daily wage for Packing Person (₹)
  masterWorkersCount?: number; // Cooking Master count (legacy)
  helperWorkersCount?: number; // Packaging / Helper count (legacy)
  overtimeHours?: number;
  overtimeCost?: number; // ₹
  totalLabourCost: number; // ₹

  // 3. Oil Used & Spendings
  oilUsedLitres: number; // Litres of cooking oil consumed
  oilCostPerLitre: number; // ₹ per Litre
  oilOpeningLitres?: number;
  oilClosingLitres?: number;
  totalOilCost: number; // ₹ (oilUsedLitres * oilCostPerLitre)

  // 4. Firewood & Fuel Used ("Fire Work")
  fuelType: 'Firewood' | 'Commercial Gas LPG' | 'Briquet / Biomass' | 'Electric' | 'Mixed';
  firewoodUsedKg?: number; // kg of firewood consumed
  firewoodCostPerKg?: number; // ₹ per kg firewood
  gasCylindersUsed?: number; // cylinders used
  gasCostPerCylinder?: number; // ₹ per cylinder
  totalFuelCost: number; // ₹ Firewood/Gas fuel spendings

  // 5. Covers Used to Pack Packets ("Cover Used to Packetckets")
  coversUsed: CoverUsageItem[];
  totalCoversCount: number;
  totalCoverWastageCount: number;
  totalCoverCost: number; // ₹

  // 6. Recipes & Packets Packed on Different Weight Limits
  weightLimitsPacked: WeightLimitPack[];
  totalPacketsPacked: number;
  totalWeightPackedKg: number;

  // Other Overheads / Expenses
  overheadCost?: number; // ₹

  // Grand Total Day Spending
  totalDaySpending: number; // Material + Labour + Oil + Firewood + Covers + Overheads

  // Production Output
  totalCookedKg?: number;
  costPerCookedKg?: number;

  supervisorName?: string;
  notes?: string;
}


