"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  ContractTicketSaleFormInput,
  contractTicketSaleFormSchema,
} from "@/lib/schemas/contract-ticket-sale-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

interface ContractTicketSaleFormProps {
  onSubmit: (values: ContractTicketSaleFormInput) => void;
  defaultValues?: Partial<ContractTicketSaleFormInput>;
}

const ContractTicketSaleForm = ({
  onSubmit,
  defaultValues,
}: ContractTicketSaleFormProps) => {
  const form = useForm<ContractTicketSaleFormInput>({
    resolver: zodResolver(contractTicketSaleFormSchema),
    defaultValues: defaultValues || {
      customerFirstName: "",
      customerPhone: "",
      orderTotal: 0,
      createdBy: "admin",
      cinemaName: "Trung tâm chiếu phim quốc gia",
      cinemaAddress: "Số 87, Láng Hạ, Quận Ba Đình, Thành phố Hà Nội",
      cinemaPhone: "024.3514.1791",
      cinemaFax: "024.3514.8647",
      cinemaWebsite: "https://chieuphimquocgia.com.vn",
    },
  });

  return (
    <div className="px-6 py-5">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          id="contract-ticket-sale-form"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="border border-primary border-dashed bg-primary/10 rounded-lg p-4 mb-10">
                <p className="text-sm font-bold mb-3">
                  Thông tin khách hàng (bên mua)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerFirstName"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Tên khách hàng</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nhập tên khách hàng"
                            {...field}
                            className="bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Số điện thoại</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nhập số điện thoại"
                            {...field}
                            className="bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <FormField
                control={form.control}
                name="orderTotal"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="text-primary font-bold">
                      Giá trị hợp đồng
                    </FormLabel>
                    <FormControl>
                      <NumberInput
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Nhập giá trị hợp đồng"
                        suffix=" VNĐ"
                        thousandSeparator={","}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="createdBy"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Nhân viên xử lý</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Nhập nhân viên xử lý"
                        readOnly
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border border-primary border-dashed bg-primary/10 rounded-lg p-4">
              <p className="text-sm font-bold mb-3">Thông tin rạp chiếu phim</p>
              <FormField
                control={form.control}
                name="cinemaName"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Rạp chiếu</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập rạp chiếu"
                        {...field}
                        className="bg-white"
                        readOnly
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cinemaAddress"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Địa chỉ</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập địa chỉ"
                        {...field}
                        className="bg-white"
                        readOnly
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cinemaPhone"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Điện thoại</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nhập điện thoại"
                          {...field}
                          className="bg-white"
                          readOnly
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cinemaFax"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Fax</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nhập fax"
                          {...field}
                          className="bg-white"
                          readOnly
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="cinemaWebsite"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập website"
                        {...field}
                        className="bg-white"
                        readOnly
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ContractTicketSaleForm;
