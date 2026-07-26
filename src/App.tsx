import { TopBar } from '@/components/layout/TopBar';
import { EditorWorkspace } from '@/features/editor/EditorWorkspace';

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <EditorWorkspace />
    </div>
  );
}
