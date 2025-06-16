import gql from 'graphql-tag';
import * as React from 'react';
import DumbArticles from '../../components/faq/Articles';
import { faqSearchArticlesQuery } from '../../graphql/queries';
import { IFaqArticle } from '../../types';
import { useQuery } from '@apollo/client';

type Props = {
  topicId?: string;
  searchString?: string;
  articles?: IFaqArticle[];
};

const generateKoreanSearchVariants = (searchString: string): string[] => {
  if (!searchString?.trim()) return [];
  
  const trimmed = searchString.trim();
  const hasKorean = /[가-힣]/.test(trimmed);
  
  if (!hasKorean) {
    return [trimmed];
  }
  
  const variants = new Set<string>();
  
  variants.add(trimmed);
  
  const noSpaces = trimmed.replace(/\s+/g, '');
  if (noSpaces !== trimmed) {
    variants.add(noSpaces);
  }
  
  const koreanRegex = /[가-힣]{3,}/g;
  let match;
  const koreanPhrases = [];
  
  while ((match = koreanRegex.exec(noSpaces)) !== null) {
    koreanPhrases.push(match[0]);
  }
  
  koreanPhrases.forEach(phrase => {
    if (phrase.length >= 4) {
      for (let i = 2; i <= phrase.length - 2; i += 2) {
        const variant1 = phrase.slice(0, i) + ' ' + phrase.slice(i);
        variants.add(variant1);
        
        if (noSpaces.includes(phrase)) {
          const fullVariant = noSpaces.replace(phrase, variant1);
          variants.add(fullVariant);
        }
      }
    }
  });
  
  return Array.from(variants).filter(v => v.length > 0).slice(0, 4);
};

const normalizeKoreanText = (text: string): string => {
  return text
    .normalize('NFC')
    .replace(/&[a-zA-Z0-9#]+;/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
};

const robustKoreanIncludes = (text: string, search: string): boolean => {
  if (!search.trim()) return true;
  if (!text.trim()) return false;
  
  const normalizedText = normalizeKoreanText(text);
  const normalizedSearch = normalizeKoreanText(search);
  
  if (normalizedText.includes(normalizedSearch)) {
    return true;
  }
  
  const simpleText = text.replace(/\s+/g, '').toLowerCase();
  const simpleSearch = search.replace(/\s+/g, '').toLowerCase();
  
  if (simpleText.includes(simpleSearch)) {
    return true;
  }
  
  let textIndex = 0;
  let searchIndex = 0;
  
  while (textIndex < normalizedText.length && searchIndex < normalizedSearch.length) {
    if (normalizedText[textIndex] === normalizedSearch[searchIndex]) {
      searchIndex++;
    }
    textIndex++;
  }
  
  return searchIndex === normalizedSearch.length;
};

const Articles = (props: Props) => {
  const { topicId, searchString, articles } = props;

  const searchVariants = React.useMemo(() => {
    return generateKoreanSearchVariants(searchString || '');
  }, [searchString]);

  const searchKeywords = React.useMemo(() => {
    if (!searchString?.trim()) return [];
    
    const trimmed = searchString.trim();
    const hasKorean = /[가-힣]/.test(trimmed);
    
    if (hasKorean) {
      return [trimmed];
    } else {
      return trimmed.split(/\s+/);
    }
  }, [searchString]);

  const { data: data1, loading: loading1 } = useQuery(
    gql(faqSearchArticlesQuery),
    {
      fetchPolicy: 'network-only',
      variables: {
        topicId: topicId || '',
        searchString: searchVariants[0] || '',
      },
      skip: !searchString?.trim() || !topicId || searchVariants.length === 0,
    }
  );

  const { data: data2, loading: loading2 } = useQuery(
    gql(faqSearchArticlesQuery),
    {
      fetchPolicy: 'network-only',
      variables: {
        topicId: topicId || '',
        searchString: searchVariants[1] || '',
      },
      skip: !searchString?.trim() || !topicId || searchVariants.length < 2,
    }
  );

  const { data: data3, loading: loading3 } = useQuery(
    gql(faqSearchArticlesQuery),
    {
      fetchPolicy: 'network-only',
      variables: {
        topicId: topicId || '',
        searchString: searchVariants[2] || '',
      },
      skip: !searchString?.trim() || !topicId || searchVariants.length < 3,
    }
  );

  const { data: data4, loading: loading4 } = useQuery(
    gql(faqSearchArticlesQuery),
    {
      fetchPolicy: 'network-only',
      variables: {
        topicId: topicId || '',
        searchString: searchVariants[3] || '',
      },
      skip: !searchString?.trim() || !topicId || searchVariants.length < 4,
    }
  );

  const filteredArticles = React.useMemo(() => {
    let articlesToFilter: IFaqArticle[] = [];
    
    if (searchString?.trim()) {
      const allArticles: IFaqArticle[] = [];
      const seenIds = new Set<string>();
      
      const queryResults = [
        { data: data1, variant: searchVariants[0] },
        { data: data2, variant: searchVariants[1] },
        { data: data3, variant: searchVariants[2] },
        { data: data4, variant: searchVariants[3] }
      ];
      
      queryResults.forEach(({ data, variant }) => {
        if (data?.widgetsKnowledgeBaseArticles && variant) {
          data.widgetsKnowledgeBaseArticles.forEach((article: IFaqArticle) => {
            if (!seenIds.has(article._id)) {
              seenIds.add(article._id);
              allArticles.push(article);
            }
          });
        }
      });
      
      articlesToFilter = allArticles;
    } else {
      articlesToFilter = articles || [];
    }

    if (searchKeywords.length > 0) {
      const filtered = articlesToFilter.filter((article: IFaqArticle) => {
        const searchFields: string[] = [
          article.title || '',
          article.summary || '',
          article.content || ''
        ];
        
        return searchKeywords.every((keyword: string) => {
          return searchFields.some((field: string) => {
            return field && robustKoreanIncludes(field, keyword);
          });
        });
      });
      
      return filtered;
    }

    return articlesToFilter;
  }, [data1, data2, data3, data4, articles, searchKeywords, searchVariants]);

  const renderRecentArticles = () => {
    if (searchString?.trim()) {
      return filteredArticles;
    }
    
    return (articles || [])
      .sort((a, b) => {
        const dateA = new Date(a.createdDate).getTime();
        const dateB = new Date(b.createdDate).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  };

  const isLoading = searchString?.trim() ? (loading1 || loading2 || loading3 || loading4) : false;
  const finalArticles = searchString?.trim() ? filteredArticles : renderRecentArticles();

  return (
    <DumbArticles
      articles={finalArticles}
      loading={isLoading}
    />
  );
};

export default Articles;