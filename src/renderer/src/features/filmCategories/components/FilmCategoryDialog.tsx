import { useCreateFilmCategory } from "@renderer/hooks/filmCategories/useCreateFilmCategory";
import { useUpdateFilmCategory } from "@renderer/hooks/filmCategories/useUpdateFilmCategory";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { FilmCategoryProps } from "@shared/types";
import type { FormProps } from "antd";
import { Checkbox, Form, Input, message, Modal } from "antd";

type FieldType = {
  name: string;
  description: string;
  published: boolean;
};

interface FilmCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFilmCategory?: FilmCategoryProps | null;
}

const FilmCategoryDialog = ({
  open,
  onOpenChange,
  editingFilmCategory
}: FilmCategoryDialogProps) => {
  const [form] = Form.useForm();
  const isEdit = !!editingFilmCategory;

  const createFilmCategory = useCreateFilmCategory();
  const updateFilmCategory = useUpdateFilmCategory();

  const onOk = () => form.submit();
  const onCancel = () => onOpenChange(false);

  const getInitialValues = (): FieldType => {
    if (!editingFilmCategory) {
      return {
        name: "",
        description: "",
        published: true
      };
    }

    return {
      name: editingFilmCategory.name,
      description: editingFilmCategory.description || "",
      published: editingFilmCategory.published ?? true
    };
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    if (!isEdit) {
      createFilmCategory.mutate(values, {
        onSuccess: () => {
          message.success("Thêm thể loại phim thành công");
          onCancel();
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Thêm thể loại phim thất bại"));
        }
      });
      return;
    }

    updateFilmCategory.mutate(
      {
        id: editingFilmCategory.id,
        dto: values
      },
      {
        onSuccess: () => {
          message.success("Cập nhật thể loại phim thành công");
          onCancel();
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Cập nhật thể loại phim thất bại"));
        }
      }
    );
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật thể loại phim" : "Thêm mới thể loại phim"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: createFilmCategory.isPending || updateFilmCategory.isPending
      }}
      cancelButtonProps={{
        disabled: createFilmCategory.isPending || updateFilmCategory.isPending
      }}
      width={600}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
        <div className="mt-4">
          <Form.Item<FieldType>
            name="name"
            label="Tên thể loại"
            rules={[{ required: true, message: "Nhập tên thể loại phim" }]}
          >
            <Input placeholder="Nhập tên thể loại phim" />
          </Form.Item>

          <Form.Item<FieldType> name="description" label="Mô tả">
            <Input.TextArea rows={4} placeholder="Nhập mô tả" />
          </Form.Item>

          <Form.Item<FieldType> name="published" valuePropName="checked">
            <Checkbox>Xuất bản</Checkbox>
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default FilmCategoryDialog;
