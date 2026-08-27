export interface QuoteItem {
  id: string;
  text: string;
  author: string;
  category?: 'code' | 'wisdom' | 'life';
}

export interface QuotesSettings {
  category?: 'code' | 'wisdom' | 'all';
}
