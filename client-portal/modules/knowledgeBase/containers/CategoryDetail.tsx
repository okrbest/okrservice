import React from 'react';
import { Topic } from '../../types';
import CategoryDetail from '../components/CategoryDetail';
import { firstQueryValue } from '../utils/faqDisplay';

type Props = {
  queryParams: any;
  topic: Topic;
};

// 분류 정보는 topic에, 질문은 공용 목록 질의에 있으므로 별도 분류 질의를 하지 않는다
function CategoryDetailContainer({ queryParams: { id }, topic }: Props) {
  return <CategoryDetail categoryId={firstQueryValue(id)} topic={topic} />;
}

export default CategoryDetailContainer;
