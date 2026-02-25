export interface FilmProps {
  id: number;
  filmNameEn: string;
  filmName: string;
  countryId: number;
  country: {
    id: number;
    name: string;
  };
  duration: number;
  director: string;
  actors: string;
  introduction: string;
  manufacturerId: number;
  versionCode: string;
  statusCode: string;
  languageCode: string;
  holding: string;
  description: string;
  sellOnline: boolean;
  metaDescription: string;
  metaKeyword: string;
  metaTitle: string;
  limitedToStores: boolean;
  subjectToAcl: boolean;
  createdOnUtc: string;
  updatedOnUtc: string;
  published: boolean;
  deleted: boolean;
  pictureId: number;
  imageUrl: string;
  premieredDay: string;
  videoUrl: string;
  showOnHomePage: boolean;
  tags: string;
  allowCustomerReviews: boolean;
  approvedRatingSum: number;
  notApprovedRatingSum: number;
  approvedTotalReviews: number;
  notApprovedTotalReviews: number;
  totalLike: number;
  numberOfViews: number;
  isHot: number;
  ageAbove: number;
  proposedPrice: number;
  trailerOnHomePage: boolean;
  orderNo: number;
  sellOnlineBefore: number;
  createdUser: string;
  updatedUser: string;
  isFree: boolean;
  categories: FilmCategory[];
  filmStatus: FilmStatusProps;
  filmVersion: FilmVersionProps;
  filmLanguage: FilmLanguageProps;
}

export interface FilmCategory {
  id: number;
  name: string;
  filmId: number;
  categoryId: number;
  createdOnUtc: string;
  createdUser: string;
}

export interface FilmStatusProps {
  id: number;
  statusCode: string;
  statusName: string;
  deleted: boolean;
}

export interface FilmCategoryProps {
  id: number;
  name: string;
  description: string;
}

export interface FilmVersionProps {
  id: number;
  versionCode: string;
  versionName: string;
  deleted: boolean;
}

export interface CountryProps {
  id: number;
  name: string;
  allowsBilling: boolean;
  allowsShipping: boolean;
  twoLetterIsoCode: string;
  threeLetterIsoCode: string;
  numericIsoCode: number;
  subjectToVat: boolean;
  published: boolean;
  displayOrder: number;
}

export interface ManufacturerProps {
  id: number;
  name: string;
  description: string;
  manufacturerTemplateId: number;
  metaKeywords: string;
  metaDescription: string;
  metaTitle: string;
  pictureId: number;
  pageSize: number;
  allowCustomersToSelectPageSize: boolean;
  pageSizeOptions: string;
  priceRanges: string;
  subjectToAcl: boolean;
  limitedToStores: boolean;
  published: boolean;
  deleted: boolean;
  displayOrder: number;
  createdOnUtc: string;
  updatedOnUtc: string;
  fullName: string;
  address: string;
  acountBank: string;
  bankName: string;
  addressBank: string;
  phoneNumber: string;
  fax: string;
  url: string;
  createdUser: string;
  updatedUser: string;
}

export interface FilmLanguageProps {
  id: number;
  languageCode: string;
  languageName: string;
  deleted: boolean;
}

export interface GeneralDataProps {
  filmVersions: FilmVersionProps[];
  countries: CountryProps[];
  manufacturers: ManufacturerProps[];
  languages: FilmLanguageProps[];
  filmStatuses: FilmStatusProps[];
}
