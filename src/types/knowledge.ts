export interface KnowledgeItem {
  id: string;
  url: string;
  title: string;
  domain: string;
  createdAt: string;
  source: string;
}

export interface KnowledgePage {
  items: KnowledgeItem[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
