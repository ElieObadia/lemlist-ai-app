import ItemListItem from "./ItemListItem";

const EmptyState = () => (
  <li className="flex justify-center items-center text-gray-500 h-full">
    <p>
      Aucune donnée disponible. Cliquez sur "Collecter données" pour récupérer les campagnes.
    </p>
  </li>
);

export default function ItemList({ title, items, variant, onItemClick }) {
  const itemHeight = 60;
  const padding = 32;
  const minHeight = itemHeight + padding;

  return (
    <section>
      <h2 className="underline underline-offset-8">Liste des {title}</h2>
      <ul
        className="p-4 flex flex-col gap-4 overflow-y-auto bg-neutral-200"
        style={{ minHeight: `${minHeight}px`, maxHeight: "66vh" }}
      >
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          items.map((item) => (
            <ItemListItem
              key={item.id}
              item={item}
              variant={variant}
              onItemClick={onItemClick}
            />
          ))
        )}
      </ul>
    </section>
  );
}
