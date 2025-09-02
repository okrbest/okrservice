/**
 * 한글 정렬을 위한 간단한 유틸리티 함수
 */

/**
 * 회사 목록을 한글 순서로 정렬하는 함수
 * @param companies 회사 목록
 * @param sortDirection 정렬 방향 (1: 오름차순, -1: 내림차순)
 * @returns 정렬된 회사 목록
 */
export const sortCompaniesByName = (companies: any[], sortDirection: number = 1): any[] => {
  if (!companies || companies.length === 0) {
    return companies;
  }

  try {
    return [...companies].sort((a, b) => {
      const nameA = (a.primaryName || a.name || '').toString();
      const nameB = (b.primaryName || b.name || '').toString();
      
      // 한글 정렬을 위한 localeCompare 사용
      const result = nameA.localeCompare(nameB, 'ko', {
        numeric: true,
        sensitivity: 'base'
      });
      
      return sortDirection === -1 ? -result : result;
    });
  } catch (error) {
    console.error('한글 정렬 오류:', error);
    // 오류 발생 시 원본 반환
    return companies;
  }
};
