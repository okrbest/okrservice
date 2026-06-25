import React from 'react';
import Link from 'next/link';
import { Config, Topic } from '../../types';
import { HomeCategoryGrid, HomeCategoryCard } from './styles';
import { ERXES_TO_MATERIAL } from './SideBar';

type Props = {
  topic: Topic;
  config: Config;
};

function CategoryList({ topic }: Props) {
  const { parentCategories = [] } = topic;

  if (parentCategories.length === 0) return null;

  const allCategories = parentCategories.flatMap((p) => [
    p,
    ...(p.childrens || []),
  ]);

  return (
    <HomeCategoryGrid>
      {allCategories.map((cat) => (
        <Link key={cat._id} href={`/knowledge-base/category?id=${cat._id}`}>
          <a style={{ textDecoration: 'none' }}>
            <HomeCategoryCard>
              <div className="card-icon">
                <span className="material-icons">
                  {ERXES_TO_MATERIAL[cat.icon] || 'folder'}
                </span>
              </div>
              <div className="card-body">
                <h5>{cat.title}</h5>
                {cat.description && <p>{cat.description}</p>}
                <span className="article-count">
                  <span className="material-icons">article</span>
                  {cat.numOfArticles || 0}건
                </span>
              </div>
            </HomeCategoryCard>
          </a>
        </Link>
      ))}
    </HomeCategoryGrid>
  );
}

export default CategoryList;
