module gogeo {
  export interface Query {
    build(): any;
  }

  export interface IGeom {
    type: string;
  }

  export interface IPoint extends IGeom {
    coordinates: Array<number>;
  }

  export interface IGeomSpace extends IGeom {
    source: string;
    coordinates: Array<Array<Array<number>>>;
  }

  export interface IBucket {
    key: string;
    doc_count: number;
  }

  export interface IHashtagResult {
    doc_total: number;
    buckets: Array<IBucket>;
  }

  export interface IStatsSumAgg {
    key: string;
    sum: number;
  }

  export interface ITweet {
    created_at: string;
    id: string;
    text: string;
    source: string;
    truncated: boolean;
    in_reply_to_status_id: number;
    in_reply_to_user_id: number;
    in_reply_to_screen_name: string;
    retweet_count: number;
    favorite_count: number;
    favorited: boolean;
    retweeted: boolean;
    lang: string;
    timestamp_ms: number;
    "user.name": string;
    "user.screen_name": string;
    "user.profile_image_url": string;
    "place.country": string;
    "place.full_name": string;
    "place.bounding_box.coordinates": string;
  }

  export interface ITransaction {
    name: string,
    username: string,
    email: string,
    amount: number,
    date: string,
    type: string,
    place_type: string,
    cnpj: number,
    company_name: string,
    fantasy_name: string,
    city: string,
    state: string,
    geo_code: number,
    cnae: number,
    cnae_label: string,
    installment: number,
    installments: number,
    card_brand: string
  }

  export interface IDateRange {
    start: Date;
    end: Date;
  }

  export interface IValueRange {
    min: number;
    max: number;
  }

  export interface IDateHistogram {
    timestamp: number;
    date_string: string;
    count: number;
  }
}