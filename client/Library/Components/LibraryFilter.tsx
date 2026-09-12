import * as React from "react";
import { useRef, useCallback } from "react";
import { useEffect } from "react";

interface LibraryFilterProps {
  applyFilterFn: (filter: string) => void;
}

export function LibraryFilter(props: LibraryFilterProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Default focus() scrolls the element into view. Harmless everywhere
    // this used to render into a non-scrolling ancestor, but Library
    // Manager's phone-width layout (library-manager.less) made its
    // container an actual scroll parent - without preventScroll, focusing
    // this on mount scrolled the pane header (and its close button) off
    // the top edge with no way back.
    inputRef.current.focus({ preventScroll: true });
  }, [inputRef]);

  const applyFilter = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const filterValue = event.currentTarget.value.toLocaleLowerCase();
      setTimeout(() => props.applyFilterFn(filterValue));
    },
    [props.applyFilterFn]
  );

  return (
    <input
      className="filter-library"
      placeholder="Filter..."
      onChange={applyFilter}
      ref={inputRef}
    />
  );
}
