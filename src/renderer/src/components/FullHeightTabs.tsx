import { cn } from "@renderer/lib/utils";
import { Tabs, type TabsProps } from "antd";

const PANEL_CLASS_NAME = "h-full min-h-0 min-w-0";

type TabsClassNames = NonNullable<TabsProps["classNames"]>;
type TabsClassNamesFunction = Extract<TabsClassNames, (...args: never[]) => unknown>;
type TabsClassNamesObject = Exclude<TabsClassNames, TabsClassNamesFunction>;

const withFullHeightPanels = (classNames?: TabsClassNamesObject): TabsClassNamesObject => ({
  ...classNames,
  body: cn(PANEL_CLASS_NAME, classNames?.body),
  content: cn(PANEL_CLASS_NAME, classNames?.content)
});

const getClassNames = (classNames: TabsProps["classNames"]): TabsProps["classNames"] => {
  if (typeof classNames === "function") {
    return (info) => withFullHeightPanels(classNames(info));
  }

  return withFullHeightPanels(classNames);
};

const FullHeightTabs = ({ className, classNames, ...props }: TabsProps) => (
  <Tabs
    {...props}
    className={cn("flex h-full min-h-0 min-w-0 flex-col", className)}
    classNames={getClassNames(classNames)}
  />
);

export default FullHeightTabs;
