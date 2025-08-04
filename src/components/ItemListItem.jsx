import { Button } from "@heroui/react";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../constants/routes";

export default function ItemListItem({ item, variant, onItemClick }) {
  const renderButtons = () => {
    if (variant === "campaigns") {
      return (
        <Button
          as={Link}
          to={ROUTES.CAMPAIGN_PROSPECTS(item.id)}
          isIconOnly
          aria-label="Open"
          disableRipple
          radius="none"
          size="sm"
          className="cursor-pointer border-2 border-black flex justify-center align-center scale-bounce"
        >
          <ArrowUpRight size={20} />
        </Button>
      );
    }

    if (variant === "prospects") {
      return (
        <Button
          onPress={() => onItemClick?.(item)}
          isIconOnly
          aria-label="Open"
          disableRipple
          radius="none"
          className="cursor-pointer border-2 border-black aspect-square w-8 h-8 flex justify-center align-center scale-bounce bg-white"
        >
          <ArrowRight size={20} />
        </Button>
      );
    }

    return null;
  };

  return (
    <li
      className="flex justify-between align-center border-2 border-black p-2 bg-white"
      style={{ margin: 0 }}
    >
      <h3
        className="m-0 flex justify-center items-center text-medium font-medium"
        style={{ margin: 0 }}
      >
        {item.name}
      </h3>
      {renderButtons()}
    </li>
  );
}
