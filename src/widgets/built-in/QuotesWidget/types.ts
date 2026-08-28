export interface QuoteItem {
  id: string;
  text: string;
  author: string;
  category?: 'code' | 'wisdom' | 'life' | 'motivation';
}

export interface QuotesSettings {
  category?: 'code' | 'wisdom' | 'life' | 'motivation' | 'all';
}
