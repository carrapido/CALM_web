import { PageFrame } from '../shared/ui/templates/PageFrame'

type PagePlaceholderProps = {
  title: string
}

// Stands in for each page body until its own feature builds it.
export function PagePlaceholder({ title }: PagePlaceholderProps) {
  return <PageFrame title={title} />
}
