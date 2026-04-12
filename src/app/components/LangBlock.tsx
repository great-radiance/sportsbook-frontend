import { apiGetTranslate } from "@/api/apiGetTranslate";
import { getAppConfig } from "@/shared/config/appConfig";
import { useQuery } from "@tanstack/preact-query";
import { FunctionComponent } from "preact";

export const LangBlock: FunctionComponent<{ text: string }> = ({ text }) => {
  const { lang } = getAppConfig();
  // const [data, setData] = useState<string>(en);

  const { data } = useQuery<any>({
    queryKey: ["translate", text, lang],
    queryFn: () => {
      if (lang === "en") {
        return text;
      }
      return text;
      // return apiGetTranslate(text, lang);
    },
    staleTime: Infinity,
  });

  // useEffect(() => {
  //   (async () => {
  //     const res = await apiGetTranslate(en, lang);
  //     const data = await res.json();
  //     setData(data);
  //   })();
  // }, []);
  return <>{data?.translation || text}</>;
};
